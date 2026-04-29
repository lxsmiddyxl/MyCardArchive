-- Phase 15: user_wantlist_index + user_havelist_index for fast trade matching (RLS: own rows).

-- ---------------------------------------------------------------------------
-- user_wantlist_index
-- ---------------------------------------------------------------------------

create table public.user_wantlist_index (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint user_wantlist_index_quantity_pos check (quantity > 0),
  constraint user_wantlist_index_pkey primary key (user_id, card_id)
);

create index idx_wantlist_card_id on public.user_wantlist_index (card_id);
create index idx_wantlist_user_id on public.user_wantlist_index (user_id);

comment on table public.user_wantlist_index is 'Denormalized wantlist rows for matching (card_id lookups).';

alter table public.user_wantlist_index enable row level security;

create policy "user_wantlist_index_select_own"
  on public.user_wantlist_index
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_wantlist_index_insert_own"
  on public.user_wantlist_index
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_wantlist_index_update_own"
  on public.user_wantlist_index
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.user_wantlist_index to authenticated;

-- ---------------------------------------------------------------------------
-- user_havelist_index
-- ---------------------------------------------------------------------------

create table public.user_havelist_index (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint user_havelist_index_quantity_pos check (quantity > 0),
  constraint user_havelist_index_pkey primary key (user_id, card_id)
);

create index idx_havelist_card_id on public.user_havelist_index (card_id);
create index idx_havelist_user_id on public.user_havelist_index (user_id);

comment on table public.user_havelist_index is 'Denormalized havelist rows for matching (card_id lookups).';

alter table public.user_havelist_index enable row level security;

create policy "user_havelist_index_select_own"
  on public.user_havelist_index
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_havelist_index_insert_own"
  on public.user_havelist_index
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_havelist_index_update_own"
  on public.user_havelist_index
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.user_havelist_index to authenticated;
