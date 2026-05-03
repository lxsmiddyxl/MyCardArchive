-- Card Catalog v1: set metadata (code, release year, publisher), generated image_url on cards,
-- pg_trgm fuzzy search RPCs, and minimal Base-era seed rows (non-destructive inserts).

-- ---------------------------------------------------------------------------
-- pg_trgm (fuzzy search)
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- catalog_sets — publisher, printed code, release year
-- ---------------------------------------------------------------------------

alter table public.catalog_sets
  add column if not exists set_code text,
  add column if not exists release_year smallint,
  add column if not exists publisher text;

comment on column public.catalog_sets.set_code is 'Short printed set code (e.g. BASE, JU).';
comment on column public.catalog_sets.release_year is 'Primary calendar year for the set (catalog v1).';
comment on column public.catalog_sets.publisher is 'Publisher label for display (e.g. The Pokémon Company International).';

update public.catalog_sets
set
  release_year = coalesce(
    release_year,
    extract(year from release_date::timestamptz)::smallint
  )
where release_date is not null;

update public.catalog_sets
set publisher = coalesce(nullif(trim(publisher), ''), 'The Pokémon Company International')
where publisher is null or trim(publisher) = '';

-- ---------------------------------------------------------------------------
-- catalog_cards — generated image_url
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'catalog_cards'
      and column_name = 'image_url'
  ) then
    alter table public.catalog_cards
      add column image_url text
      generated always as (coalesce(image_large, image_small)) stored;
  end if;
end $$;

comment on column public.catalog_cards.image_url is 'Preferred card art URL (large, else small) — generated.';

create index if not exists catalog_cards_name_trgm_idx
  on public.catalog_cards using gin (name gin_trgm_ops);

create index if not exists catalog_cards_set_name_cover_idx
  on public.catalog_cards (set_id, name);

create index if not exists catalog_sets_name_trgm_idx
  on public.catalog_sets using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- search_catalog_cards_v1
-- ---------------------------------------------------------------------------

create or replace function public.search_catalog_cards_v1(
  p_query text,
  p_set_id text default null,
  p_limit integer default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 24), 40));
  qt text := trim(coalesce(p_query, ''));
begin
  if length(qt) < 1 then
    return '[]'::jsonb;
  end if;

  perform set_config('pg_trgm.similarity_threshold', '0.14', true);

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'set_id', q.set_id,
          'name', q.name,
          'number', q.number,
          'rarity', q.rarity,
          'image_url', q.image_url,
          'set', q.set_name
        )
        order by q.rank desc, q.name asc, q.number asc
      )
      from (
        select
          c.id,
          c.set_id,
          c.name,
          c.number,
          c.rarity,
          coalesce(c.image_large, c.image_small) as image_url,
          s.name as set_name,
          greatest(
            similarity(lower(c.name), lower(qt)),
            similarity(lower(coalesce(c.number, '')), lower(qt)) * 0.88,
            similarity(lower(s.name), lower(qt)) * 0.5
          )::double precision as rank
        from public.catalog_cards c
        inner join public.catalog_sets s on s.id = c.set_id
        where (p_set_id is null or c.set_id = p_set_id)
          and (
            c.name ilike '%' || qt || '%'
            or coalesce(c.number, '') ilike '%' || qt || '%'
            or lower(s.name) ilike '%' || lower(qt) || '%'
            or c.name % qt
            or s.name % qt
          )
        order by rank desc, c.name asc, c.number asc
        limit lim
      ) q
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.search_catalog_cards_v1(text, text, integer) is
  'Catalog v1: fuzzy + ILIKE card search; optional set_id scope.';

revoke all on function public.search_catalog_cards_v1(text, text, integer) from public;
grant execute on function public.search_catalog_cards_v1(text, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_catalog_sets_v1
-- ---------------------------------------------------------------------------

create or replace function public.search_catalog_sets_v1(
  p_query text,
  p_limit integer default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 24), 50));
  qt text := trim(coalesce(p_query, ''));
begin
  if length(qt) < 1 then
    return '[]'::jsonb;
  end if;

  perform set_config('pg_trgm.similarity_threshold', '0.16', true);

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'name', q.name,
          'series', q.series,
          'set_code', q.set_code,
          'release_year', q.release_year,
          'release_date', q.release_date,
          'publisher', q.publisher,
          'symbol_url', q.symbol_url,
          'logo_url', q.logo_url
        )
        order by q.rank desc, q.name asc
      )
      from (
        select
          s.id,
          s.name,
          s.series,
          s.set_code,
          s.release_year,
          s.release_date,
          s.publisher,
          s.symbol_url,
          s.logo_url,
          greatest(
            similarity(lower(s.name), lower(qt)),
            similarity(lower(coalesce(s.series, '')), lower(qt)) * 0.55,
            similarity(lower(coalesce(s.set_code, '')), lower(qt)) * 0.9
          )::double precision as rank
        from public.catalog_sets s
        where
          s.name ilike '%' || qt || '%'
          or coalesce(s.series, '') ilike '%' || qt || '%'
          or coalesce(s.set_code, '') ilike '%' || qt || '%'
          or s.name % qt
        order by rank desc, s.name asc
        limit lim
      ) q
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.search_catalog_sets_v1(text, integer) is
  'Catalog v1: fuzzy + ILIKE set search for browse UI.';

revoke all on function public.search_catalog_sets_v1(text, integer) from public;
grant execute on function public.search_catalog_sets_v1(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed — Base / Jungle / Fossil (starter rows; do not overwrite synced sets)
-- ---------------------------------------------------------------------------

insert into public.catalog_sets (
  id, name, series, printed_total, total, release_date,
  symbol_url, logo_url, set_code, release_year, publisher
)
values
  (
    'base1',
    'Base Set',
    'Original Series',
    102,
    102,
    '1999-01-09'::date,
    null,
    null,
    'BASE',
    1999,
    'The Pokémon Company International'
  ),
  (
    'base2',
    'Jungle',
    'Original Series',
    64,
    64,
    '1999-06-16'::date,
    null,
    null,
    'JU',
    1999,
    'The Pokémon Company International'
  ),
  (
    'base3',
    'Fossil',
    'Original Series',
    62,
    62,
    '1999-10-10'::date,
    null,
    null,
    'FO',
    1999,
    'The Pokémon Company International'
  )
on conflict (id) do nothing;

insert into public.catalog_cards (
  id, set_id, name, number, rarity, supertype, subtypes, image_small, image_large
)
values
  ('base1-4', 'base1', 'Charizard', '4', 'Rare', 'Pokémon', array['Stage 2']::text[], null, null),
  ('base1-2', 'base1', 'Blastoise', '2', 'Rare', 'Pokémon', array['Stage 2']::text[], null, null),
  ('base1-15', 'base1', 'Alakazam', '15', 'Rare', 'Pokémon', array['Stage 2']::text[], null, null),
  ('base2-1', 'base2', 'Scyther', '1', 'Rare Holo', 'Pokémon', array['Basic']::text[], null, null),
  ('base2-4', 'base2', 'Jolteon', '4', 'Rare Holo', 'Pokémon', array['Stage 1']::text[], null, null),
  ('base3-1', 'base3', 'Aerodactyl', '1', 'Rare Holo', 'Pokémon', array['Stage 1']::text[], null, null),
  ('base3-6', 'base3', 'Muk', '6', 'Rare Holo', 'Pokémon', array['Stage 1']::text[], null, null)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
