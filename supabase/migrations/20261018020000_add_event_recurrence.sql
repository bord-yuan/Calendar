alter table public.events
add column repeat_type text not null default 'once',
add column repeat_days smallint[] not null default '{}'::smallint[];

alter table public.events
add constraint events_repeat_type_check
check (repeat_type in ('once', 'daily', 'weekdays', 'custom'));

alter table public.events
add constraint events_repeat_days_check
check (
  (
    repeat_type = 'custom'
    and cardinality(repeat_days) > 0
    and repeat_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
  or
  (repeat_type <> 'custom' and cardinality(repeat_days) = 0)
);

create index events_user_id_repeat_idx
on public.events (user_id, repeat_type, ddl_date);

create table public.event_occurrence_status (
  user_id text not null references public.login(user_id) on delete cascade,
  event_id uuid not null references public.events(event_id) on delete cascade,
  occurrence_date date not null,
  event_status text not null default 'completed'
    check (event_status in ('unfinished', 'completed')),
  primary key (event_id, occurrence_date)
);

alter table public.event_occurrence_status enable row level security;
revoke all on table public.event_occurrence_status from anon, authenticated;

create type public.event_occurrence as (
  user_id text,
  event_id uuid,
  event_name text,
  type text,
  start_date date,
  start_time time,
  ddl_date date,
  ddl_time time,
  colour text,
  description text,
  event_status text,
  repeat_type text,
  repeat_days smallint[],
  occurrence_date date,
  series_start_date date,
  series_ddl_date date
);

drop function public.get_events(text, text, date, date);

create function public.get_events(
  user_id text,
  password text,
  from_date date,
  to_date date
)
returns setof public.event_occurrence
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  return query
  with occurrence_candidates as (
    select
      events.*,
      anchor.anchor_date,
      generated.occurrence::date as occurrence_date,
      events.start_date as base_start_date,
      events.ddl_date as base_ddl_date
    from public.events as events
    cross join lateral (
      select case
        when events.type = '事件' then events.start_date
        else events.ddl_date
      end as anchor_date
    ) as anchor
    cross join lateral generate_series(
      case
        when events.repeat_type = 'once' or $3 is null then anchor.anchor_date
        else greatest(
          anchor.anchor_date,
          $3 - (events.ddl_date - anchor.anchor_date)
        )
      end,
      case
        when events.repeat_type = 'once' or $4 is null then anchor.anchor_date
        else $4
      end,
      interval '1 day'
    ) as generated(occurrence)
    where events.user_id = $1
      and (
        ($3 is null and $4 is null)
        or events.repeat_type = 'once'
        or events.repeat_type = 'daily'
        or (
          events.repeat_type = 'weekdays'
          and extract(isodow from generated.occurrence) between 1 and 5
        )
        or (
          events.repeat_type = 'custom'
          and extract(isodow from generated.occurrence)::smallint = any(events.repeat_days)
        )
      )
  )
  select
    candidates.user_id,
    candidates.event_id,
    candidates.event_name,
    candidates.type,
    case
      when candidates.type = '事件' then candidates.occurrence_date
      else null
    end as start_date,
    candidates.start_time,
    (
      candidates.occurrence_date
      + (candidates.base_ddl_date - candidates.anchor_date)
    )::date as ddl_date,
    candidates.ddl_time,
    candidates.colour,
    candidates.description,
    case
      when candidates.repeat_type = 'once' then candidates.event_status
      else coalesce(status.event_status, 'unfinished')
    end as event_status,
    candidates.repeat_type,
    candidates.repeat_days,
    candidates.occurrence_date,
    candidates.base_start_date as series_start_date,
    candidates.base_ddl_date as series_ddl_date
  from occurrence_candidates as candidates
  left join public.event_occurrence_status as status
    on status.event_id = candidates.event_id
   and status.occurrence_date = candidates.occurrence_date
  where (
      $3 is null
      or (
        candidates.occurrence_date
        + (candidates.base_ddl_date - candidates.anchor_date)
      ) >= $3
    )
    and ($4 is null or candidates.occurrence_date <= $4)
  order by
    candidates.occurrence_date,
    coalesce(candidates.start_time, candidates.ddl_time),
    candidates.ddl_time;
end;
$$;

revoke all on function public.get_events(text, text, date, date) from public;
revoke execute on function public.get_events(text, text, date, date) from authenticated;
grant execute on function public.get_events(text, text, date, date) to anon;

drop function public.save_event(
  text,
  text,
  uuid,
  text,
  text,
  date,
  time,
  date,
  time,
  text,
  text
);

create function public.save_event(
  user_id text,
  password text,
  event_id uuid,
  event_name text,
  type text,
  repeat_type text,
  repeat_days smallint[],
  start_date date,
  start_time time,
  ddl_date date,
  ddl_time time,
  colour text,
  description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_event_id uuid;
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  if $5 not in ('任务', '事件') then
    raise exception 'Invalid type';
  end if;

  if $6 not in ('once', 'daily', 'weekdays', 'custom') then
    raise exception 'Invalid repeat_type';
  end if;

  if $6 = 'custom' and (
    $7 is null
    or cardinality($7) = 0
    or not ($7 <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
  ) then
    raise exception 'Custom repeat_days must contain weekdays from 1 to 7';
  end if;

  if $5 = '事件' and (
    $8 is null
    or $9 is null
    or ($8 + $9) >= ($10 + $11)
  ) then
    raise exception 'Event start must be earlier than event end';
  end if;

  if event_id is null then
    insert into public.events (
      user_id,
      event_name,
      type,
      repeat_type,
      repeat_days,
      start_date,
      start_time,
      ddl_date,
      ddl_time,
      colour,
      description
    ) values (
      $1,
      $4,
      $5,
      $6,
      case when $6 = 'custom' then $7 else '{}'::smallint[] end,
      case when $5 = '事件' then $8 else null end,
      case when $5 = '事件' then $9 else null end,
      $10,
      $11,
      $12,
      $13
    )
    returning events.event_id into saved_event_id;
  else
    update public.events as events
    set event_name = $4,
        type = $5,
        repeat_type = $6,
        repeat_days = case
          when $6 = 'custom' then $7
          else '{}'::smallint[]
        end,
        start_date = case when $5 = '事件' then $8 else null end,
        start_time = case when $5 = '事件' then $9 else null end,
        ddl_date = $10,
        ddl_time = $11,
        colour = $12,
        description = $13
    where events.event_id = $3 and events.user_id = $1
    returning events.event_id into saved_event_id;

    if saved_event_id is null then raise exception 'Event not found'; end if;
  end if;

  return saved_event_id;
end;
$$;

revoke all on function public.save_event(
  text, text, uuid, text, text, text, smallint[], date, time, date, time, text, text
) from public;
revoke execute on function public.save_event(
  text, text, uuid, text, text, text, smallint[], date, time, date, time, text, text
) from authenticated;
grant execute on function public.save_event(
  text, text, uuid, text, text, text, smallint[], date, time, date, time, text, text
) to anon;

drop function public.update_event_status(text, text, uuid, text);

create function public.update_event_status(
  user_id text,
  password text,
  event_id uuid,
  occurrence_date date,
  event_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_repeat_type text;
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  if $5 not in ('unfinished', 'completed') then
    raise exception 'Invalid event_status';
  end if;

  select events.repeat_type into saved_repeat_type
  from public.events as events
  where events.event_id = $3 and events.user_id = $1;

  if saved_repeat_type is null then
    raise exception 'Event not found';
  end if;

  if saved_repeat_type = 'once' then
    update public.events as events
    set event_status = $5
    where events.event_id = $3 and events.user_id = $1;
  elsif $5 = 'completed' then
    insert into public.event_occurrence_status (
      user_id,
      event_id,
      occurrence_date,
      event_status
    ) values ($1, $3, $4, $5)
    on conflict on constraint event_occurrence_status_pkey
    do update set event_status = excluded.event_status;
  else
    delete from public.event_occurrence_status as status
    where status.event_id = $3
      and status.occurrence_date = $4
      and status.user_id = $1;
  end if;

  return true;
end;
$$;

revoke all on function public.update_event_status(text, text, uuid, date, text)
from public;
revoke execute on function public.update_event_status(text, text, uuid, date, text)
from authenticated;
grant execute on function public.update_event_status(text, text, uuid, date, text)
to anon;
