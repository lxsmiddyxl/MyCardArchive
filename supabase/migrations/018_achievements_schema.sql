-- Achievements catalog and per-user unlocks (schema + RLS only).

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  requirement_type text not null,
  requirement_value int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_user_id_idx on public.user_achievements (user_id);
create index if not exists user_achievements_achievement_id_idx on public.user_achievements (achievement_id);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- achievements: read-only for authenticated clients
drop policy if exists "achievements_select_authenticated" on public.achievements;
create policy "achievements_select_authenticated"
  on public.achievements
  for select
  to authenticated
  using (true);

-- user_achievements: read/insert own rows only; no update/delete policies
drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
  on public.user_achievements
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_achievements_insert_own" on public.user_achievements;
create policy "user_achievements_insert_own"
  on public.user_achievements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select on table public.achievements to authenticated;
grant select, insert on table public.user_achievements to authenticated;

notify pgrst, 'reload schema';
