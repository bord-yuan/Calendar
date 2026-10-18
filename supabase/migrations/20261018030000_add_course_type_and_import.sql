alter table public.events
drop constraint events_type_check;

alter table public.events
add constraint events_type_check
check (type in ('任务', '事件', '课程'));

alter table public.events
drop constraint events_start_check;

alter table public.events
add constraint events_start_check
check (
  (type = '任务' and start_date is null and start_time is null)
  or
  (
    type in ('事件', '课程')
    and start_date is not null
    and start_time is not null
    and (start_date + start_time) < (ddl_date + ddl_time)
  )
);

drop index public.events_user_id_start_idx;

create index events_user_id_start_idx
on public.events (user_id, start_date, start_time)
where type in ('事件', '课程');

create or replace function public.get_events(
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
        when events.type in ('事件', '课程') then events.start_date
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
      when candidates.type in ('事件', '课程') then candidates.occurrence_date
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

create or replace function public.save_event(
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

  if $5 not in ('任务', '事件', '课程') then
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

  if $5 in ('事件', '课程') and (
    $8 is null
    or $9 is null
    or ($8 + $9) >= ($10 + $11)
  ) then
    raise exception 'Start must be earlier than end';
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
      case when $5 in ('事件', '课程') then $8 else null end,
      case when $5 in ('事件', '课程') then $9 else null end,
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
        start_date = case
          when $5 in ('事件', '课程') then $8
          else null
        end,
        start_time = case
          when $5 in ('事件', '课程') then $9
          else null
        end,
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

create function public.import_courses(
  user_id text,
  password text,
  course_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  imported_count integer;
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  if $3 is null or jsonb_typeof($3) <> 'array' or jsonb_array_length($3) = 0 then
    raise exception 'Course items are required';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset($3) as course(
      event_name text,
      start_date date,
      start_time time,
      ddl_date date,
      ddl_time time,
      colour text,
      description text
    )
    where course.event_name is null
      or btrim(course.event_name) = ''
      or course.start_date is null
      or course.start_time is null
      or course.ddl_date is null
      or course.ddl_time is null
      or course.colour is null
      or (course.start_date + course.start_time) >= (course.ddl_date + course.ddl_time)
  ) then
    raise exception 'Invalid course item';
  end if;

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
  )
  select
    $1,
    course.event_name,
    '课程',
    'once',
    '{}'::smallint[],
    course.start_date,
    course.start_time,
    course.ddl_date,
    course.ddl_time,
    course.colour,
    coalesce(course.description, '')
  from jsonb_to_recordset($3) as course(
    event_name text,
    start_date date,
    start_time time,
    ddl_date date,
    ddl_time time,
    colour text,
    description text
  );

  get diagnostics imported_count = row_count;
  return imported_count;
end;
$$;

revoke all on function public.import_courses(text, text, jsonb) from public;
revoke execute on function public.import_courses(text, text, jsonb) from authenticated;
grant execute on function public.import_courses(text, text, jsonb) to anon;
