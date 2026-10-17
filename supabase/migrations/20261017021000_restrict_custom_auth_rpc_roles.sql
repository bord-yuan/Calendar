revoke execute on function public.login_user(text, text, boolean)
from authenticated;

revoke execute on function public.get_events(text, text, date, date)
from authenticated;

revoke execute on function public.save_event(
  text,
  text,
  uuid,
  text,
  text,
  date,
  time,
  text,
  text
)
from authenticated;

revoke execute on function public.delete_event(text, text, uuid)
from authenticated;
