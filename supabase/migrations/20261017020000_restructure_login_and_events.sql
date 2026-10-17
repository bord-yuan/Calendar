create extension if not exists pgcrypto with schema extensions;

drop table if exists public.events;

create table public.login (
  user_id text primary key,
  password text not null check (password <> '')
);

create table public.events (
  user_id text not null references public.login(user_id) on delete cascade,
  event_id uuid primary key default gen_random_uuid(),
  event_name text not null,
  type text not null,
  ddl_date date not null,
  ddl_time time not null,
  colour text not null,
  description text not null default ''
);

create index events_user_id_ddl_idx
on public.events (user_id, ddl_date, ddl_time);

alter table public.login enable row level security;
alter table public.events enable row level security;

revoke all on table public.login from anon, authenticated;
revoke all on table public.events from anon, authenticated;

create or replace function public.login_user(
  user_id text,
  password text,
  create_user boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_password text;
begin
  if password is null or password = '' then
    return 'password_empty';
  end if;

  select login.password into stored_password
  from public.login as login
  where login.user_id = $1;

  if stored_password is null then
    if not create_user then return 'not_found'; end if;
    insert into public.login (user_id, password)
    values ($1, extensions.crypt($2, extensions.gen_salt('bf')));
    return 'created';
  end if;

  if stored_password = extensions.crypt($2, stored_password) then
    return 'authenticated';
  end if;

  return 'invalid_password';
end;
$$;

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
    and ($4 is null or events.ddl_date <= $4)
  order by events.ddl_date, events.ddl_time;
end;
$$;

create or replace function public.save_event(
  user_id text,
  password text,
  event_id uuid,
  event_name text,
  type text,
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

  if event_id is null then
    insert into public.events (
      user_id, event_name, type, ddl_date, ddl_time, colour, description
    ) values ($1, $4, $5, $6, $7, $8, $9)
    returning events.event_id into saved_event_id;
  else
    update public.events as events
    set event_name = $4,
        type = $5,
        ddl_date = $6,
        ddl_time = $7,
        colour = $8,
        description = $9
    where events.event_id = $3 and events.user_id = $1
    returning events.event_id into saved_event_id;

    if saved_event_id is null then raise exception 'Event not found'; end if;
  end if;

  return saved_event_id;
end;
$$;

create or replace function public.delete_event(
  user_id text,
  password text,
  event_id uuid
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

  delete from public.events as events
  where events.event_id = $3 and events.user_id = $1;
  return found;
end;
$$;

revoke all on function public.login_user(text, text, boolean) from public;
revoke all on function public.get_events(text, text, date, date) from public;
revoke all on function public.save_event(text, text, uuid, text, text, date, time, text, text) from public;
revoke all on function public.delete_event(text, text, uuid) from public;

grant execute on function public.login_user(text, text, boolean) to anon;
grant execute on function public.get_events(text, text, date, date) to anon;
grant execute on function public.save_event(text, text, uuid, text, text, date, time, text, text) to anon;
grant execute on function public.delete_event(text, text, uuid) to anon;
