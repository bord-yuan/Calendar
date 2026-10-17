create table public.trial0 (
  id bigint generated always as identity primary key,
  event text,
  date date
);

alter table public.trial0 enable row level security;
