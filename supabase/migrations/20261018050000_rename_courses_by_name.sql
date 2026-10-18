create function public.rename_courses_by_name(
  user_id text,
  password text,
  old_event_name text,
  new_event_name text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  renamed_count integer;
begin
  if not exists (
    select 1 from public.login as login
    where login.user_id = $1
      and login.password = extensions.crypt($2, login.password)
  ) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  if $3 is null or btrim($3) = '' then
    raise exception 'Old course name is required';
  end if;

  if $4 is null or btrim($4) = '' then
    raise exception 'New course name is required';
  end if;

  update public.events as events
  set event_name = btrim($4)
  where events.user_id = $1
    and events.type = '课程'
    and events.event_name = $3;

  get diagnostics renamed_count = row_count;
  return renamed_count;
end;
$$;

revoke all on function public.rename_courses_by_name(text, text, text, text)
from public;
revoke execute on function public.rename_courses_by_name(text, text, text, text)
from authenticated;
grant execute on function public.rename_courses_by_name(text, text, text, text)
to anon;
