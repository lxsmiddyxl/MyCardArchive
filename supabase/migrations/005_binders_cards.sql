-- Binders and cards: user-owned collections with row-level security tied to binder ownership.

-- ---------------------------------------------------------------------------
-- binders
-- ---------------------------------------------------------------------------

create table public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.binders is
  'A named container for trading cards; each binder belongs to exactly one user.';

comment on column public.binders.id is 'Primary key.';
comment on column public.binders.user_id is 'Owner of this binder; matches auth.users.id.';
comment on column public.binders.name is 'Display name for the binder.';
comment on column public.binders.created_at is 'When the binder was created.';

create index binders_user_id_idx on public.binders (user_id);

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  name text not null,
  set_name text,
  number text,
  rarity text,
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.cards is
  'Individual trading card records stored inside a binder.';

comment on column public.cards.id is 'Primary key.';
comment on column public.cards.binder_id is 'Parent binder; cascade delete removes cards when the binder is deleted.';
comment on column public.cards.name is 'Card name.';
comment on column public.cards.set_name is 'Set or expansion name.';
comment on column public.cards.number is 'Collector number or print run identifier.';
comment on column public.cards.rarity is 'Rarity label (e.g. common, rare).';
comment on column public.cards.image_url is 'URL to card artwork or scan.';
comment on column public.cards.notes is 'Free-form notes.';
comment on column public.cards.created_at is 'When the card row was created.';

create index cards_binder_id_idx on public.cards (binder_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.binders enable row level security;
alter table public.cards enable row level security;

-- binders: only the owning user
create policy "binders_select_own"
  on public.binders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "binders_insert_own"
  on public.binders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "binders_update_own"
  on public.binders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "binders_delete_own"
  on public.binders
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- cards: only when the row belongs to a binder owned by the current user
create policy "cards_select_via_owned_binder"
  on public.cards
  for select
  to authenticated
  using (
    binder_id in (select id from public.binders where user_id = auth.uid())
  );

create policy "cards_insert_via_owned_binder"
  on public.cards
  for insert
  to authenticated
  with check (
    binder_id in (select id from public.binders where user_id = auth.uid())
  );

create policy "cards_update_via_owned_binder"
  on public.cards
  for update
  to authenticated
  using (
    binder_id in (select id from public.binders where user_id = auth.uid())
  )
  with check (
    binder_id in (select id from public.binders where user_id = auth.uid())
  );

create policy "cards_delete_via_owned_binder"
  on public.cards
  for delete
  to authenticated
  using (
    binder_id in (select id from public.binders where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.binders to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
