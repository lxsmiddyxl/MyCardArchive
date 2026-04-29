-- Pokémon TCG catalog cache (public read; writes via service role only).

create table public.catalog_sets (
  id text primary key,
  name text not null,
  series text not null default '',
  printed_total int,
  total int,
  release_date date,
  symbol_url text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_cards (
  id text primary key,
  set_id text not null references public.catalog_sets (id) on delete cascade,
  name text not null,
  number text not null default '',
  rarity text,
  supertype text,
  subtypes text[] not null default '{}',
  image_small text,
  image_large text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_cards_set_id_idx on public.catalog_cards (set_id);
create index catalog_cards_name_idx on public.catalog_cards (name);
create index catalog_cards_number_idx on public.catalog_cards (number);

create trigger catalog_sets_set_updated_at
  before update on public.catalog_sets
  for each row
  execute function public.set_updated_at();

create trigger catalog_cards_set_updated_at
  before update on public.catalog_cards
  for each row
  execute function public.set_updated_at();

alter table public.catalog_sets enable row level security;
alter table public.catalog_cards enable row level security;

create policy catalog_sets_select_public
  on public.catalog_sets
  for select
  to anon, authenticated
  using (true);

create policy catalog_cards_select_public
  on public.catalog_cards
  for select
  to anon, authenticated
  using (true);

grant select on table public.catalog_sets to anon, authenticated;
grant select on table public.catalog_cards to anon, authenticated;

-- Optional link from user cards to official catalog entries (user CRUD unchanged; catalog FK is public read).
alter table public.cards
  add column if not exists catalog_card_id text references public.catalog_cards (id) on delete set null;

create index if not exists cards_catalog_card_id_idx on public.cards (catalog_card_id);

notify pgrst, 'reload schema';
