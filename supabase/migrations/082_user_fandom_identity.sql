-- Fandom identity: favorite set / era / artist / lineage / foil theme (+ badges / flair triggers).

create table if not exists public.user_fandom_identity (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  favorite_set_id text,
  favorite_era_id text,
  favorite_artist_id text,
  favorite_character_id text,
  favorite_theme_id text,
  updated_at timestamptz not null default now()
);

comment on table public.user_fandom_identity is
  'User-selected TCG taste anchors — complements catalog cards and static fandom-metadata in the app tier.';

create index if not exists user_fandom_identity_updated_idx on public.user_fandom_identity (updated_at desc);

alter table public.user_fandom_identity enable row level security;

drop policy if exists "user_fandom_identity_own_select" on public.user_fandom_identity;
create policy "user_fandom_identity_own_select"
  on public.user_fandom_identity for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_fandom_identity_own_write" on public.user_fandom_identity;
create policy "user_fandom_identity_own_write"
  on public.user_fandom_identity for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.user_fandom_identity to authenticated;
grant all on table public.user_fandom_identity to service_role;

-- ---------------------------------------------------------------------------
-- Badges (award each once when facet first saved)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_fandom_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_user_id is null then
    return;
  end if;
  select f.* into r
  from public.user_fandom_identity f
  where f.user_id = p_user_id;

  if not found then
    return;
  end if;

  if coalesce(trim(r.favorite_set_id), '') <> '' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'fandom', 'set_loyalist', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(trim(r.favorite_era_id), '') <> '' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'fandom', 'era_specialist', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(trim(r.favorite_artist_id), '') <> '' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'fandom', 'artist_devotee', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(trim(r.favorite_character_id), '') <> '' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'fandom', 'character_fanatic', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(trim(r.favorite_theme_id), '') <> '' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'fandom', 'theme_collector', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_fandom_badges(uuid) from public;
grant execute on function public.refresh_user_fandom_badges(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RPC: read single + batch + upsert + suggest
-- ---------------------------------------------------------------------------

create or replace function public.get_user_fandom_identity(p_user_id uuid)
returns table (
  user_id uuid,
  favorite_set_id text,
  favorite_era_id text,
  favorite_artist_id text,
  favorite_character_id text,
  favorite_theme_id text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.user_id, f.favorite_set_id, f.favorite_era_id, f.favorite_artist_id, f.favorite_character_id,
         f.favorite_theme_id, f.updated_at
  from public.user_fandom_identity f
  where f.user_id = p_user_id;
$$;

revoke all on function public.get_user_fandom_identity(uuid) from public;
grant execute on function public.get_user_fandom_identity(uuid) to authenticated;

create or replace function public.get_users_fandom_identity_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  favorite_set_id text,
  favorite_era_id text,
  favorite_artist_id text,
  favorite_character_id text,
  favorite_theme_id text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    f.favorite_set_id,
    f.favorite_era_id,
    f.favorite_artist_id,
    f.favorite_character_id,
    f.favorite_theme_id,
    f.updated_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_fandom_identity f on f.user_id = u.uid;
$$;

revoke all on function public.get_users_fandom_identity_batch(uuid[]) from public;
grant execute on function public.get_users_fandom_identity_batch(uuid[]) to authenticated;

create or replace function public.upsert_user_fandom_identity(
  p_user_id uuid,
  p_favorite_set_id text default null,
  p_favorite_era_id text default null,
  p_favorite_artist_id text default null,
  p_favorite_character_id text default null,
  p_favorite_theme_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.user_fandom_identity (
    user_id,
    favorite_set_id,
    favorite_era_id,
    favorite_artist_id,
    favorite_character_id,
    favorite_theme_id,
    updated_at
  )
  values (
    p_user_id,
    nullif(trim(coalesce(p_favorite_set_id, '')), ''),
    nullif(trim(coalesce(p_favorite_era_id, '')), ''),
    nullif(trim(coalesce(p_favorite_artist_id, '')), ''),
    nullif(trim(coalesce(p_favorite_character_id, '')), ''),
    nullif(trim(coalesce(p_favorite_theme_id, '')), ''),
    now()
  )
  on conflict (user_id) do update set
    favorite_set_id = excluded.favorite_set_id,
    favorite_era_id = excluded.favorite_era_id,
    favorite_artist_id = excluded.favorite_artist_id,
    favorite_character_id = excluded.favorite_character_id,
    favorite_theme_id = excluded.favorite_theme_id,
    updated_at = excluded.updated_at;

  perform public.refresh_user_fandom_badges(p_user_id);
end;
$$;

revoke all on function public.upsert_user_fandom_identity(uuid, text, text, text, text, text) from public;
grant execute on function public.upsert_user_fandom_identity(uuid, text, text, text, text, text) to authenticated;

create or replace function public.suggest_user_fandom_identity(p_user_id uuid)
returns table (
  suggested_set_id text,
  suggested_era_id text,
  suggested_artist_id text,
  suggested_character_id text,
  suggested_theme_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select cc.set_id
     from public.cards c
     inner join public.catalog_cards cc on cc.id = c.catalog_card_id
     where p_user_id is not null
       and c.user_id = p_user_id
       and c.catalog_card_id is not null
     group by cc.set_id
     order by count(*) desc nulls last
     limit 1) as suggested_set_id,
    (select case
      when cs.id is null then null::text
      when coalesce(lower(cs.series), '') ~ '(scarlet|violet|paldea)' then 'scarlet_violet'
      when coalesce(lower(cs.series), '') ~ '(sword|shield|galar)' then 'sword_shield'
      when coalesce(lower(cs.series), '') ~ '(sun|moon|alola)' then 'sun_moon_gx'
      when coalesce(lower(cs.series), '') ~ '(xy|mega)' then 'xy_mega_ex'
      when coalesce(lower(cs.series), '') ~ '(black|white|unova)' then 'black_white_bw'
      when coalesce(lower(cs.series), '') ~ '(neo)' then 'neo_block'
      when coalesce(lower(cs.series), '') ~ '(ex|ruby|sapphire|emerald)' then 'ex_series'
      else null::text
     end
     from (
       select cc.set_id s
       from public.cards c
       inner join public.catalog_cards cc on cc.id = c.catalog_card_id
       where p_user_id is not null and c.user_id = p_user_id and c.catalog_card_id is not null
       group by cc.set_id
       order by count(*) desc nulls last
       limit 1
     ) top_set
     left join public.catalog_sets cs on cs.id = top_set.s
    ) as suggested_era_id,
    null::text as suggested_artist_id,
    (select slug
     from (
       select 'charizard_line'::text as slug,
         sum(case when cc.name ilike '%charizard%' then 1 else 0 end)::bigint as n
       from public.cards c
       inner join public.catalog_cards cc on cc.id = c.catalog_card_id
       where c.user_id = p_user_id and c.catalog_card_id is not null
       union all
       select 'pikachu_mascots'::text,
         sum(case when cc.name ilike '%pikachu%' then 1 else 0 end)::bigint
       from public.cards c
       inner join public.catalog_cards cc on cc.id = c.catalog_card_id
       where c.user_id = p_user_id and c.catalog_card_id is not null
       union all
       select 'eevee_lab'::text,
         sum(case when cc.name ~* '(eevee|vaporeon|jolteon|flareon|espeon|umbreon|leafeon|glaceon|sylveon)' then 1 else 0 end)::bigint
       from public.cards c
       inner join public.catalog_cards cc on cc.id = c.catalog_card_id
       where c.user_id = p_user_id and c.catalog_card_id is not null
       union all
       select 'dragon_tcg'::text,
         sum(case when cc.subtypes && array['Dragon']::text[] then 1 else 0 end)::bigint
       from public.cards c
       inner join public.catalog_cards cc on cc.id = c.catalog_card_id
       where c.user_id = p_user_id and c.catalog_card_id is not null
     ) scored
     where n > 0
     order by n desc
     limit 1
    ) as suggested_character_id,
    (
      select case
        when picks.them = 'vmax_mechanics' then 'vmax_gx_block'::text
        else picks.them::text
      end
      from (
        select 'rainbow_full'::text as them, sum(case when cc.rarity ilike '%rainbow%' then 1 else 0 end)::bigint as n
        from public.cards c
        inner join public.catalog_cards cc on cc.id = c.catalog_card_id
        where c.user_id = p_user_id and c.catalog_card_id is not null
        union all
        select 'alt_art_secret'::text,
          sum(case when cc.name ilike '% alt %' or cc.rarity ilike '%alt%' then 1 else 0 end)::bigint
        from public.cards c
        inner join public.catalog_cards cc on cc.id = c.catalog_card_id
        where c.user_id = p_user_id and c.catalog_card_id is not null
        union all
        select 'vmax_mechanics'::text,
          sum(case when cc.rarity ilike '%vmax%' or cc.name ilike '%vmax%' then 1 else 0 end)::bigint
        from public.cards c
        inner join public.catalog_cards cc on cc.id = c.catalog_card_id
        where c.user_id = p_user_id and c.catalog_card_id is not null
        union all
        select 'full_art'::text,
          sum(case when cc.rarity ilike '%full art%' or cc.rarity ilike '%illustration%' then 1 else 0 end)::bigint
        from public.cards c
        inner join public.catalog_cards cc on cc.id = c.catalog_card_id
        where c.user_id = p_user_id and c.catalog_card_id is not null
      ) themed(them, n)
        where themed.n > 0
        order by themed.n desc
        limit 1
      ) picks
    ) as suggested_theme_id
$$;

revoke all on function public.suggest_user_fandom_identity(uuid) from public;
grant execute on function public.suggest_user_fandom_identity(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_user_badges: insert fandom after collection_value (else bumped to 11)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_badges(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  badge_type text,
  badge_key text,
  earned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.user_id, b.badge_type, b.badge_key, b.earned_at
  from public.user_badges b
  where b.user_id = p_user_id
  order by
    case b.badge_type
      when 'tier' then 0
      when 'tenure' then 1
      when 'scan_milestone' then 2
      when 'seasonal_event' then 3
      when 'journey' then 4
      when 'collection_mastery' then 5
      when 'trade_reputation' then 6
      when 'play_identity' then 7
      when 'collection_value' then 8
      when 'fandom' then 9
      else 11
    end,
    case b.badge_type
      when 'scan_milestone' then
        case b.badge_key
          when 'scans_5000' then 5000
          when 'scans_1000' then 1000
          when 'scans_500' then 500
          when 'scans_100' then 100
          else 0
        end
      when 'seasonal_event' then
        case b.badge_key
          when 'holiday_2026_collector' then 3
          when 'summer_2026_scan_sprint' then 2
          when 'spring_2026_collector' then 1
          else 0
        end
      when 'journey' then
        case b.badge_key
          when 'journey_rep_1000' then 7
          when 'journey_first_seasonal' then 6
          when 'journey_ten_sets' then 5
          when 'journey_first_binder' then 4
          when 'journey_scan_500' then 3
          when 'journey_scan_50' then 2
          else 0
        end
      when 'collection_mastery' then
        case b.badge_key
          when 'cm_set_ten' then 12
          when 'cm_set_five' then 11
          when 'cm_set_first' then 10
          when 'cm_binder_ten' then 3
          when 'cm_binder_three' then 2
          when 'cm_binder_first' then 1
          else 0
        end
      when 'trade_reputation' then
        case b.badge_key
          when 'reliable_shop' then 3
          when 'veteran_trader' then 2
          when 'trusted_trader' then 1
          else 0
        end
      when 'play_identity' then
        case b.badge_key
          when 'commander_enthusiast' then 4
          when 'control_specialist' then 3
          when 'aggro_master' then 2
          when 'deckbuilder' then 1
          else 0
        end
      when 'collection_value' then
        case b.badge_key
          when 'high_value_collector' then 3
          when 'rarity_hunter' then 2
          when 'unique_collector' then 1
          else 0
        end
      when 'fandom' then
        case b.badge_key
          when 'set_loyalist' then 5
          when 'era_specialist' then 4
          when 'artist_devotee' then 3
          when 'character_fanatic' then 2
          when 'theme_collector' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
