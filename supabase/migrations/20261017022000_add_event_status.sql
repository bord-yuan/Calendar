alter table public.events
add column event_status text not null default 'unfinished';

alter table public.events
add constraint events_event_status_check
check (event_status in ('unfinished', 'completed'));

create or replace function public.update_event_status(
  user_id text,
  password text,
  event_id uuid,
  event_status text
)
returns boolean
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

  if $4 not in ('unfinished', 'completed') then
    raise exception 'Invalid event_status';
  end if;

  update public.events as events
  set event_status = $4
  where events.event_id = $3 and events.user_id = $1;

  return found;
end;
$$;

revoke all on function public.update_event_status(text, text, uuid, text) from public;
grant execute on function public.update_event_status(text, text, uuid, text) to anon;
