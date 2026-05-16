-- Binder Upgrade Arc Phase 5: profile showcase pins + profile theme/banner.

alter table public.profiles
  add column if not exists profile_theme text not null default 'color';

alter table public.profiles
  add column if not exists profile_banner_url text;

alter table public.profiles
  drop constraint if exists profiles_profile_theme_check;

alter table public.profiles
  add constraint profiles_profile_theme_check
  check (profile_theme in ('color', 'holo', 'dark'));

create table if not exists public.profile_showcase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  binder_id uuid references public.binders (id) on delete cascade,
  group_id uuid references public.binder_groups (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint profile_showcase_one_target check (
    (binder_id is not null and group_id is null)
    or (binder_id is null and group_id is not null)
  )
);

create index if not exists profile_showcase_items_user_pos_idx
  on public.profile_showcase_items (user_id, position);

alter table public.profile_showcase_items enable row level security;

create policy "profile_showcase_owner"
  on public.profile_showcase_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profile_showcase_select_public"
  on public.profile_showcase_items for select to anon, authenticated
  using (true);

grant select, insert, update, delete on public.profile_showcase_items to authenticated;
grant select on public.profile_showcase_items to anon;
