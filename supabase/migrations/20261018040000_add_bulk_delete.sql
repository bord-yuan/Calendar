create function public.delete_events_by_field(
  user_id text,
  password text,
  field_name text,
  field_value text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  if $4 is null or $4 = '' then
    raise exception 'Field value is required';
  end if;

  case $3
    when 'event_name' then
      delete from public.events as events
      where events.user_id = $1 and events.event_name = $4;
    when 'type' then
      delete from public.events as events
      where events.user_id = $1
        and events.type = case
          when lower($4) = 'lecturer' then '课程'
          else $4
        end;
    when 'start_date' then
      delete from public.events as events
      where events.user_id = $1 and events.start_date = $4::date;
    when 'start_time' then
      delete from public.events as events
      where events.user_id = $1 and events.start_time = $4::time;
    when 'ddl_date' then
      delete from public.events as events
      where events.user_id = $1 and events.ddl_date = $4::date;
    when 'ddl_time' then
      delete from public.events as events
      where events.user_id = $1 and events.ddl_time = $4::time;
    when 'colour' then
      delete from public.events as events
      where events.user_id = $1 and events.colour = $4;
    when 'description' then
      delete from public.events as events
      where events.user_id = $1 and events.description = $4;
    when 'event_status' then
      delete from public.events as events
      where events.user_id = $1 and events.event_status = $4;
    when 'repeat_type' then
      delete from public.events as events
      where events.user_id = $1 and events.repeat_type = $4;
    else
      raise exception 'Unsupported field';
  end case;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_events_by_field(text, text, text, text)
from public;
revoke execute on function public.delete_events_by_field(text, text, text, text)
from authenticated;
grant execute on function public.delete_events_by_field(text, text, text, text)
to anon;
