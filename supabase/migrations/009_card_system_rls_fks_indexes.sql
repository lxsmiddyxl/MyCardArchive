-- Card system repair: RLS policies, foreign keys, and indexes.
-- Safe after 006, 007_reconcile_sets_and_profiles, and 008_reconcile_cards_and_binder_columns.
--
-- RLS contract:
--   binders:     unchanged (already owner-scoped in 005)
--   cards:       SELECT/INSERT/UPDATE/DELETE → auth.uid() = user_id
--   binder_cards: same
--   sets:        SELECT → user_id IS NULL OR auth.uid() = user_id
--                INSERT/UPDATE/DELETE → auth.uid() = user_id
--
-- Foreign keys (profiles as user anchor; sets.user_id nullable for catalog):
--   binders.user_id          → profiles.id
--   cards.user_id            → profiles.id
--   cards.set_id             → sets.id
--   binder_cards.binder_id   → binders.id
--   binder_cards.card_id     → cards.id
--   binder_cards.user_id     → profiles.id
--   sets.user_id             → profiles.id (nullable)

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.cards enable row level security;
alter table public.binder_cards enable row level security;
alter table public.sets enable row level security;
alter table public.binders enable row level security;
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- sets — policies
-- ---------------------------------------------------------------------------

drop policy if exists "sets_select_visible" on public.sets;
drop policy if exists "sets_insert_own" on public.sets;
drop policy if exists "sets_update_own" on public.sets;
drop policy if exists "sets_delete_own" on public.sets;

create policy "sets_select_visible"
  on public.sets
  for select
  to authenticated
  using (user_id is null or auth.uid() = user_id);

create policy "sets_insert_own"
  on public.sets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "sets_update_own"
  on public.sets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sets_delete_own"
  on public.sets
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.sets to authenticated;

-- ---------------------------------------------------------------------------
-- cards — policies
-- ---------------------------------------------------------------------------

drop policy if exists "cards_select_via_owned_binder" on public.cards;
drop policy if exists "cards_insert_via_owned_binder" on public.cards;
drop policy if exists "cards_update_via_owned_binder" on public.cards;
drop policy if exists "cards_delete_via_owned_binder" on public.cards;
drop policy if exists "cards_select_own" on public.cards;
drop policy if exists "cards_insert_own" on public.cards;
drop policy if exists "cards_update_own" on public.cards;
drop policy if exists "cards_delete_own" on public.cards;

create policy "cards_select_own"
  on public.cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "cards_insert_own"
  on public.cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "cards_update_own"
  on public.cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cards_delete_own"
  on public.cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.cards to authenticated;

-- ---------------------------------------------------------------------------
-- binder_cards — policies (owner row only: auth.uid() = user_id)
-- ---------------------------------------------------------------------------

drop policy if exists "binder_cards_select_own" on public.binder_cards;
drop policy if exists "binder_cards_insert_own" on public.binder_cards;
drop policy if exists "binder_cards_update_own" on public.binder_cards;
drop policy if exists "binder_cards_delete_own" on public.binder_cards;

create policy "binder_cards_select_own"
  on public.binder_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "binder_cards_insert_own"
  on public.binder_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "binder_cards_update_own"
  on public.binder_cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "binder_cards_delete_own"
  on public.binder_cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.binder_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Foreign keys (add only if missing; names match PostgreSQL defaults)
-- ---------------------------------------------------------------------------

-- binders.user_id → profiles.id
do $fb$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'binders'
      and c.conname = 'binders_user_id_fkey'
  ) then
    alter table public.binders
      add constraint binders_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $fb$;

-- cards.user_id → profiles.id
do $fc$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.conname = 'cards_user_id_fkey'
  ) then
    alter table public.cards
      add constraint cards_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $fc$;

-- cards.set_id → sets.id
do $fcs$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.conname = 'cards_set_id_fkey'
  ) then
    alter table public.cards
      add constraint cards_set_id_fkey
      foreign key (set_id) references public.sets (id) on delete set null;
  end if;
end $fcs$;

-- sets.user_id → profiles.id (nullable)
do $fs$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'sets'
      and c.conname = 'sets_user_id_fkey'
  ) then
    alter table public.sets
      add constraint sets_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $fs$;

-- binder_cards.binder_id → binders.id
do $fbcb$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'binder_cards'
      and c.conname = 'binder_cards_binder_id_fkey'
  ) then
    alter table public.binder_cards
      add constraint binder_cards_binder_id_fkey
      foreign key (binder_id) references public.binders (id) on delete cascade;
  end if;
end $fbcb$;

-- binder_cards.card_id → cards.id
do $fbcc$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'binder_cards'
      and c.conname = 'binder_cards_card_id_fkey'
  ) then
    alter table public.binder_cards
      add constraint binder_cards_card_id_fkey
      foreign key (card_id) references public.cards (id) on delete cascade;
  end if;
end $fbcc$;

-- binder_cards.user_id → profiles.id
do $fbcu$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'binder_cards'
      and c.conname = 'binder_cards_user_id_fkey'
  ) then
    alter table public.binder_cards
      add constraint binder_cards_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $fbcu$;

-- ---------------------------------------------------------------------------
-- Indexes for user_id and foreign keys
-- ---------------------------------------------------------------------------

create index if not exists binders_user_id_idx on public.binders (user_id);
create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists sets_user_id_idx on public.sets (user_id);
create index if not exists binder_cards_binder_id_idx on public.binder_cards (binder_id);
create index if not exists binder_cards_card_id_idx on public.binder_cards (card_id);
create index if not exists binder_cards_user_id_idx on public.binder_cards (user_id);
