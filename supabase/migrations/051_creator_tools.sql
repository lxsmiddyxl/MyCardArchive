-- Phase 70: Creator tools — deck guides + collection showcases.

create table public.deck_guides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deck_guides_one_per_deck unique (deck_id)
);

create index deck_guides_user_idx on public.deck_guides (user_id, updated_at desc);

comment on table public.deck_guides is 'User-authored deck guides (strategy + highlights).';

alter table public.deck_guides enable row level security;

create policy "deck_guides_select_public_or_own"
  on public.deck_guides for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.decks d
      where d.id = deck_guides.deck_id and d.is_public = true
    )
  );

create policy "deck_guides_insert_own_deck"
  on public.deck_guides for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );

create policy "deck_guides_update_own"
  on public.deck_guides for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deck_guides_delete_own"
  on public.deck_guides for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.deck_guides to authenticated;

create table public.collection_showcases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  binder_ids uuid[] not null default array[]::uuid[],
  featured_card_ids uuid[] not null default array[]::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index collection_showcases_user_idx on public.collection_showcases (user_id, updated_at desc);

comment on table public.collection_showcases is 'Curated collection showcase pages.';

alter table public.collection_showcases enable row level security;

create policy "collection_showcases_select_authenticated"
  on public.collection_showcases for select to authenticated using (true);

create policy "collection_showcases_insert_own"
  on public.collection_showcases for insert to authenticated
  with check (auth.uid() = user_id);

create policy "collection_showcases_update_own"
  on public.collection_showcases for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "collection_showcases_delete_own"
  on public.collection_showcases for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.collection_showcases to authenticated;
