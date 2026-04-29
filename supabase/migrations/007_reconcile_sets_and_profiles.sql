-- Reconcile remote DB when 006 was recorded as applied but its DDL never ran
-- (e.g. an older `sets` table without `user_id`). Run before 008_card_system_rls_fks_indexes.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.sets
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

create index if not exists sets_user_id_idx on public.sets (user_id);
