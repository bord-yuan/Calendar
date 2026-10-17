create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  category text not null default '其他',
  color text not null default '#4f46e5',
  location text,
  notes text,
  repeat_type text not null default 'none'
    check (repeat_type in ('none', 'weekly')),
  repeat_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at > start_at),
  constraint events_repeat_until_check check (
    repeat_until is null or repeat_type = 'weekly'
  )
);

create index events_user_start_idx
on public.events (user_id, start_at);

create index events_user_repeat_idx
on public.events (user_id, repeat_type, repeat_until);

alter table public.events enable row level security;

create policy "Users can view own events"
on public.events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own events"
on public.events for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own events"
on public.events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own events"
on public.events for delete to authenticated
using ((select auth.uid()) = user_id);
