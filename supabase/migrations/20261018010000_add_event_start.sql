alter table public.events
add column start_date date,
add column start_time time;

update public.events
set type = '任务';

alter table public.events
add constraint events_type_check
check (type in ('任务', '事件'));

alter table public.events
add constraint events_start_check
check (
  (type = '任务' and start_date is null and start_time is null)
  or
  (
    type = '事件'
    and start_date is not null
    and start_time is not null
    and (start_date + start_time) < (ddl_date + ddl_time)
  )
);

create index events_user_id_start_idx
on public.events (user_id, start_date, start_time)
where type = '事件';

create or replace function public.get_events(
  user_id text,
  password text,
  from_date date,
  to_date date
)
returns setof public.events
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
  select events.* from public.events as events
  where events.user_id = $1
    and ($3 is null or events.ddl_date >= $3)
    and (
      $4 is null
      or (events.type = '事件' and events.start_date <= $4)
      or (events.type = '任务' and events.ddl_date <= $4)
    )
  order by
    coalesce(events.start_date, events.ddl_date),
    coalesce(events.start_time, events.ddl_time),
    events.ddl_date,
    events.ddl_time;
end;
$$;

drop function public.save_event(
  text,
  text,
  uuid,
  text,
  text,
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

  if $5 = '事件' and (
    $6 is null
    or $7 is null
    or ($6 + $7) >= ($8 + $9)
  ) then
    raise exception 'Event start must be earlier than event end';
  end if;

  if event_id is null then
    insert into public.events (
      user_id,
      event_name,
      type,
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
      case when $5 = '事件' then $6 else null end,
      case when $5 = '事件' then $7 else null end,
      $8,
      $9,
      $10,
      $11
    )
    returning events.event_id into saved_event_id;
  else
    update public.events as events
    set event_name = $4,
        type = $5,
        start_date = case when $5 = '事件' then $6 else null end,
        start_time = case when $5 = '事件' then $7 else null end,
        ddl_date = $8,
        ddl_time = $9,
        colour = $10,
        description = $11
    where events.event_id = $3 and events.user_id = $1
    returning events.event_id into saved_event_id;

    if saved_event_id is null then raise exception 'Event not found'; end if;
  end if;

  return saved_event_id;
end;
$$;

revoke all on function public.save_event(
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
) from public;

grant execute on function public.save_event(
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
) to anon;
