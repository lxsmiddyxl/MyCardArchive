-- Binder-scoped activity log for public feeds and explore sorting.

create table if not exists public.binder_activity (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.binder_activity
  drop constraint if exists binder_activity_type_check;

alter table public.binder_activity
  add constraint binder_activity_type_check
  check (
    type in (
      'binder_created',
      'card_added',
      'card_removed',
      'layout_changed',
      'theme_changed',
      'visibility_changed'
    )
  );

create index if not exists binder_activity_binder_created_idx
  on public.binder_activity (binder_id, created_at desc);

create index if not exists binder_activity_public_binder_idx
  on public.binder_activity (created_at desc)
  where binder_id is not null;

alter table public.binder_activity enable row level security;

drop policy if exists "binder_activity_select_shared" on public.binder_activity;
create policy "binder_activity_select_shared"
  on public.binder_activity
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.binders b
      where b.id = binder_activity.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

drop policy if exists "binder_activity_insert_own" on public.binder_activity;
create policy "binder_activity_insert_own"
  on public.binder_activity
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.binders b
      where b.id = binder_activity.binder_id and b.user_id = auth.uid()
    )
  );

grant select on table public.binder_activity to anon;
grant insert on table public.binder_activity to authenticated;
