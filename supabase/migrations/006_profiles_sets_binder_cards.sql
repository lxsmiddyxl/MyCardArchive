-- Card system: profiles, sets, cards.user_id + set_id, binder_cards junction.
-- Depends on 005_binders_cards.sql (binders + cards with binder_id).
-- After this migration: cards have no binder_id; membership is binder_cards only.
--
-- Foreign keys (explicit):
--   binders.user_id           → profiles.id (re-homed from auth.users)
--   sets.user_id              → profiles.id (nullable = global catalog row)
--   cards.user_id             → profiles.id
--   cards.set_id              → sets.id
--   binder_cards.binder_id    → binders.id
--   binder_cards.card_id      → cards.id
--   binder_cards.user_id      → profiles.id
--
-- RLS summary:
--   profiles:     auth.uid() = id  (SELECT, INSERT, UPDATE, DELETE)
--   sets:         SELECT if user_id IS NULL OR auth.uid() = user_id
--                 INSERT/UPDATE/DELETE if auth.uid() = user_id (non-null rows only)
--   cards:        auth.uid() = user_id  (all operations)
--   binder_cards: auth.uid() = user_id; INSERT also requires binder+card owned by same user

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user; FK anchor for user-owned application data.';

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);

grant select, insert, update, delete on table public.profiles to authenticated;

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.binders
  drop constraint if exists binders_user_id_fkey;

alter table public.binders
  add constraint binders_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- sets
-- ---------------------------------------------------------------------------

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.sets is
  'Card set names; user_id NULL = global catalog (read-only for clients).';

create index sets_user_id_idx on public.sets (user_id);

alter table public.sets enable row level security;

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

insert into public.sets (user_id, name) values
  (null, 'Other'),
  (null, 'Promotional'),
  (null, 'Unknown set');

-- ---------------------------------------------------------------------------
-- cards: user_id, set_id, binder_cards backfill, drop binder_id
-- ---------------------------------------------------------------------------

alter table public.cards
  add column user_id uuid references public.profiles (id) on delete cascade;

update public.cards c
set user_id = b.user_id
from public.binders b
where c.binder_id = b.id;

alter table public.cards
  alter column user_id set not null;

create index cards_user_id_idx on public.cards (user_id);

alter table public.cards
  add column set_id uuid references public.sets (id) on delete set null;

create index cards_set_id_idx on public.cards (set_id);

create table public.binder_cards (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint binder_cards_one_binder_per_card unique (card_id)
);

create index binder_cards_binder_id_idx on public.binder_cards (binder_id);
create index binder_cards_card_id_idx on public.binder_cards (card_id);
create index binder_cards_user_id_idx on public.binder_cards (user_id);

comment on table public.binder_cards is
  'Junction: one card appears in at most one binder (unique card_id).';

insert into public.binder_cards (binder_id, card_id, user_id)
select binder_id, id, user_id
from public.cards;

drop policy if exists "cards_select_via_owned_binder" on public.cards;
drop policy if exists "cards_insert_via_owned_binder" on public.cards;
drop policy if exists "cards_update_via_owned_binder" on public.cards;
drop policy if exists "cards_delete_via_owned_binder" on public.cards;

alter table public.cards
  drop constraint if exists cards_binder_id_fkey;

drop index if exists public.cards_binder_id_idx;

alter table public.cards
  drop column binder_id;

alter table public.cards enable row level security;

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
-- binder_cards RLS (user_id column + ownership of binder and card)
-- ---------------------------------------------------------------------------

alter table public.binder_cards enable row level security;

create policy "binder_cards_select_own"
  on public.binder_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "binder_cards_insert_own"
  on public.binder_cards
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.binders b
      where b.id = binder_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.cards c
      where c.id = card_id
        and c.user_id = auth.uid()
    )
  );

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
