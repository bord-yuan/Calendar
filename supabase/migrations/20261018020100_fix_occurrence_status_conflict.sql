create or replace function public.update_event_status(
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
