-- Identity-driven collector search index + RPCs.
-- TS alignment: src/lib/search/search-filters.ts, src/lib/clubs/club-catalog.ts (primary club order).

-- ---------------------------------------------------------------------------
-- user_search_index
-- ---------------------------------------------------------------------------

create table if not exists public.user_search_index (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  persona_tokens tsvector,
  play_format_id text,
  play_archetype_id text,
  fandom_set_id text,
  fandom_era_id text,
  fandom_artist_id text,
  fandom_character_id text,
  fandom_theme_id text,
  value_band smallint not null default 0,
  rarity_profile text,
  binder_complete_count int not null default 0,
  set_complete_count int not null default 0,
  journey_complete_ids text[] not null default array[]::text[],
  trade_tier smallint not null default 0,
  club_ids text[] not null default array[]::text[],
  primary_club_id text,
  seasonal_event_ids text[] not null default array[]::text[],
  presence_state text,
  active_within_days int,
  events_last_7d int not null default 0,
  events_last_30d int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.user_search_index is
  'Materialized identity projection for collector discovery — no private inventory fields.';

create index if not exists user_search_index_persona_gin
  on public.user_search_index using gin (persona_tokens);

create index if not exists user_search_index_clubs_gin
  on public.user_search_index using gin (club_ids);

create index if not exists user_search_index_journey_gin
  on public.user_search_index using gin (journey_complete_ids);

create index if not exists user_search_index_seasonal_gin
  on public.user_search_index using gin (seasonal_event_ids);

create index if not exists user_search_index_play_format_idx
  on public.user_search_index (play_format_id);

create index if not exists user_search_index_play_arch_idx
  on public.user_search_index (play_archetype_id);

create index if not exists user_search_index_fandom_era_idx
  on public.user_search_index (fandom_era_id);

create index if not exists user_search_index_fandom_set_idx
  on public.user_search_index (fandom_set_id);

create index if not exists user_search_index_value_band_idx
  on public.user_search_index (value_band);

create index if not exists user_search_index_trade_idx
  on public.user_search_index (trade_tier);

create index if not exists user_search_index_presence_idx
  on public.user_search_index (presence_state);

create index if not exists user_search_index_rarity_idx
  on public.user_search_index (rarity_profile);

create index if not exists user_search_index_events7_idx
  on public.user_search_index (events_last_7d);

create index if not exists user_search_index_events30_idx
  on public.user_search_index (events_last_30d);

alter table public.user_search_index enable row level security;

drop policy if exists "user_search_index_select_authenticated" on public.user_search_index;
create policy "user_search_index_select_authenticated"
  on public.user_search_index for select to authenticated using (true);

revoke insert, update, delete on table public.user_search_index from authenticated;
grant select on table public.user_search_index to authenticated;
grant all on table public.user_search_index to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_search_index
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_search_index(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona text;
  v_ts tsvector;
  v_fmt text;
  v_arch text;
  v_fs text;
  v_fe text;
  v_fa text;
  v_fc text;
  v_ft text;
  v_cents bigint;
  v_total int;
  v_unique int;
  v_hi int;
  v_band smallint := 0;
  v_rp text;
  v_hi_r numeric;
  v_u_r numeric;
  v_binder int;
  v_set int;
  v_journeys text[];
  v_trade smallint := 0;
  v_total_tr int;
  v_pos_tr int;
  v_rel_shop boolean;
  v_vet boolean;
  v_trust boolean;
  v_clubs text[];
  v_primary text;
  v_season text[];
  v_pres text;
  v_days int;
  v_opt boolean;
  v_last timestamptz;
  v_ev7 int;
  v_ev30 int;
  v_delta_ms numeric;
begin
  if p_user_id is null then
    return;
  end if;

  select c.persona_text into v_persona from public.user_persona_cache c where c.user_id = p_user_id;
  v_ts := to_tsvector('english', coalesce(v_persona, ''));

  select p.favorite_format_id, p.favorite_archetype_id
  into v_fmt, v_arch
  from public.user_play_identity p where p.user_id = p_user_id;

  select f.favorite_set_id, f.favorite_era_id, f.favorite_artist_id, f.favorite_character_id, f.favorite_theme_id
  into v_fs, v_fe, v_fa, v_fc, v_ft
  from public.user_fandom_identity f where f.user_id = p_user_id;

  select coalesce(c.estimated_value_cents, 0)::bigint,
         coalesce(c.total_cards, 0)::int,
         coalesce(c.unique_cards, 0)::int,
         coalesce(c.high_rarity_count, 0)::int
  into v_cents, v_total, v_unique, v_hi
  from (select p_user_id as uid) x
  left join public.user_collection_value_cache c on c.user_id = x.uid;

  v_band := case
    when coalesce(v_cents, 0) >= 500000 then 4
    when coalesce(v_cents, 0) >= 100000 then 3
    when coalesce(v_cents, 0) >= 50000 then 2
    when coalesce(v_cents, 0) >= 10000 then 1
    else 0
  end;

  if coalesce(v_total, 0) <= 0 then
    v_rp := null;
  else
    v_hi_r := v_hi::numeric / greatest(v_total, 1)::numeric;
    v_u_r := v_unique::numeric / greatest(v_total, 1)::numeric;
    if v_hi_r >= 0.12 then
      v_rp := 'High-rarity heavy';
    elsif v_u_r >= 0.85 and v_total > 40 then
      v_rp := 'Unique-focused';
    elsif v_total > 200 and v_hi_r < 0.04 then
      v_rp := 'Bulk-focused';
    else
      v_rp := 'Balanced';
    end if;
  end if;

  select coalesce(count(*)::int, 0) into v_binder
  from public.user_collection_mastery m
  where m.user_id = p_user_id and m.mastery_type = 'binder' and m.is_complete = true;

  select coalesce(count(*)::int, 0) into v_set
  from public.user_collection_mastery m
  where m.user_id = p_user_id and m.mastery_type = 'set' and m.is_complete = true;

  select coalesce(array_agg(j.journey_id order by j.journey_id), array[]::text[])
  into v_journeys
  from public.user_journey_progress j
  where j.user_id = p_user_id and j.is_complete = true;

  select
    coalesce(r.completed_trades_count, 0)::int,
    coalesce(r.positive_feedback_count, 0)::int
  into v_total_tr, v_pos_tr
  from (select p_user_id as uid) x
  left join public.user_trade_reputation r on r.user_id = x.uid;

  select exists (
    select 1 from public.user_badges b
    where b.user_id = p_user_id and b.badge_type = 'trade_reputation' and b.badge_key = 'reliable_shop'
  ) into v_rel_shop;

  select exists (
    select 1 from public.user_badges b
    where b.user_id = p_user_id and b.badge_type = 'trade_reputation' and b.badge_key = 'veteran_trader'
  ) into v_vet;

  select exists (
    select 1 from public.user_badges b
    where b.user_id = p_user_id and b.badge_type = 'trade_reputation' and b.badge_key = 'trusted_trader'
  ) into v_trust;

  v_trade := case
    when coalesce(v_rel_shop, false) then 3::smallint
    when coalesce(v_vet, false) or coalesce(v_total_tr, 0) >= 50 then 2::smallint
    when coalesce(v_trust, false) or (coalesce(v_total_tr, 0) >= 10
      and coalesce(v_total_tr, 0) > 0
      and (v_pos_tr::numeric / v_total_tr::numeric) >= 0.85) then 1::smallint
    else 0::smallint
  end;

  select coalesce(array_agg(uc.club_id order by uc.club_id), array[]::text[])
  into v_clubs
  from public.user_clubs uc
  where uc.user_id = p_user_id;

  select o.cid into v_primary
  from unnest(array[
    'commander_club',
    'ex_era_dragons',
    'binder_completionists',
    'artist_devotees',
    'seasonal_grinders',
    'trusted_traders',
    'high_value_collectors'
  ]) as o(cid)
  where o.cid = any(v_clubs)
  limit 1;

  select coalesce(array_agg(distinct b.badge_key order by b.badge_key), array[]::text[])
  into v_season
  from public.user_badges b
  where b.user_id = p_user_id and b.badge_type = 'seasonal_event';

  select up.presence_opt_out, up.last_seen_at
  into v_opt, v_last
  from public.user_presence up
  where up.user_id = p_user_id;

  if coalesce(v_opt, false) then
    v_pres := 'offline';
    v_days := null;
  elsif v_last is null then
    v_pres := 'offline';
    v_days := null;
  else
    v_delta_ms := extract(epoch from (timezone('utc', now()) - v_last)) * 1000::numeric;
    if v_delta_ms <= 5::numeric * 60::numeric * 1000::numeric then
      v_pres := 'online';
    elsif v_delta_ms <= 30::numeric * 60::numeric * 1000::numeric then
      v_pres := 'recent';
    else
      v_pres := 'offline';
    end if;
    v_days := least(999, ceil(extract(epoch from (timezone('utc', now()) - v_last)) / 86400.0))::int;
  end if;

  select coalesce(count(*)::int, 0) into v_ev7
  from public.user_activity_log l
  where l.user_id = p_user_id
    and l.activity_ts >= timezone('utc', now()) - interval '7 days';

  select coalesce(count(*)::int, 0) into v_ev30
  from public.user_activity_log l
  where l.user_id = p_user_id
    and l.activity_ts >= timezone('utc', now()) - interval '30 days';

  insert into public.user_search_index (
    user_id,
    persona_tokens,
    play_format_id,
    play_archetype_id,
    fandom_set_id,
    fandom_era_id,
    fandom_artist_id,
    fandom_character_id,
    fandom_theme_id,
    value_band,
    rarity_profile,
    binder_complete_count,
    set_complete_count,
    journey_complete_ids,
    trade_tier,
    club_ids,
    primary_club_id,
    seasonal_event_ids,
    presence_state,
    active_within_days,
    events_last_7d,
    events_last_30d,
    updated_at
  )
  values (
    p_user_id,
    v_ts,
    nullif(trim(lower(coalesce(v_fmt, ''))), ''),
    nullif(trim(lower(coalesce(v_arch, ''))), ''),
    nullif(trim(coalesce(v_fs, '')), ''),
    nullif(trim(coalesce(v_fe, '')), ''),
    nullif(trim(coalesce(v_fa, '')), ''),
    nullif(trim(coalesce(v_fc, '')), ''),
    nullif(trim(coalesce(v_ft, '')), ''),
    v_band,
    v_rp,
    coalesce(v_binder, 0),
    coalesce(v_set, 0),
    coalesce(v_journeys, array[]::text[]),
    v_trade,
    coalesce(v_clubs, array[]::text[]),
    v_primary,
    coalesce(v_season, array[]::text[]),
    v_pres,
    v_days,
    coalesce(v_ev7, 0),
    coalesce(v_ev30, 0),
    now()
  )
  on conflict (user_id) do update set
    persona_tokens = excluded.persona_tokens,
    play_format_id = excluded.play_format_id,
    play_archetype_id = excluded.play_archetype_id,
    fandom_set_id = excluded.fandom_set_id,
    fandom_era_id = excluded.fandom_era_id,
    fandom_artist_id = excluded.fandom_artist_id,
    fandom_character_id = excluded.fandom_character_id,
    fandom_theme_id = excluded.fandom_theme_id,
    value_band = excluded.value_band,
    rarity_profile = excluded.rarity_profile,
    binder_complete_count = excluded.binder_complete_count,
    set_complete_count = excluded.set_complete_count,
    journey_complete_ids = excluded.journey_complete_ids,
    trade_tier = excluded.trade_tier,
    club_ids = excluded.club_ids,
    primary_club_id = excluded.primary_club_id,
    seasonal_event_ids = excluded.seasonal_event_ids,
    presence_state = excluded.presence_state,
    active_within_days = excluded.active_within_days,
    events_last_7d = excluded.events_last_7d,
    events_last_30d = excluded.events_last_30d,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_search_index(uuid) from public;
grant execute on function public.refresh_user_search_index(uuid) to service_role;

-- Throttled refresh for high-volume activity inserts
create or replace function public.refresh_user_search_index_activity_throttled(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  if exists (
    select 1
    from public.user_search_index i
    where i.user_id = p_user_id
      and i.updated_at > now() - interval '2 minutes'
  ) then
    return;
  end if;
  perform public.refresh_user_search_index(p_user_id);
end;
$$;

revoke all on function public.refresh_user_search_index_activity_throttled(uuid) from public;
grant execute on function public.refresh_user_search_index_activity_throttled(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- search_collectors
-- ---------------------------------------------------------------------------

create or replace function public.search_collectors(
  p_filters jsonb,
  p_limit int,
  p_offset int,
  p_viewer_id uuid default null
)
returns table (
  user_id uuid,
  rank_score float8,
  similarity_score float8,
  persona_text text,
  display_name text,
  username text,
  handle text,
  avatar_url text,
  presence_state text,
  active_within_days int,
  primary_club_id text,
  club_ids text[],
  events_last_7d int,
  events_last_30d int,
  play_format_id text,
  play_archetype_id text,
  fandom_era_id text,
  value_band smallint,
  trade_tier smallint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 24), 100));
  off int := greatest(0, coalesce(p_offset, 0));
begin
  return query
  with vw as (
    select vi.*
    from public.user_search_index vi
    where p_viewer_id is not null and vi.user_id = p_viewer_id
    limit 1
  ),
  matched as (
    select
      i.user_id as uid,
      pc.persona_text as p_text,
      coalesce(nullif(trim(sp.display_name), ''), sp.username, '') as dsp,
      coalesce(sp.username, '') as usr,
      coalesce(sp.handle, '') as hdl,
      coalesce(sp.avatar_url, '') as av,
      sim.score::float8 as sim_score,
      i.presence_state as pst,
      i.active_within_days as adays,
      i.primary_club_id as pclub,
      i.club_ids as cids,
      i.events_last_7d as ev7,
      i.events_last_30d as ev30,
      i.play_format_id as pfmt,
      i.play_archetype_id as parch,
      i.fandom_era_id as pfe,
      i.value_band as vb,
      i.trade_tier as tt,
      (
        coalesce(sim.score::float8, 0::float8) * 1.5::float8
        + (
            cardinality(
              coalesce(i.club_ids, array[]::text[])
              & coalesce((select vw.club_ids from vw), array[]::text[])
            )
          )::float8 * 12.0::float8
        + case
            when (select vw.play_format_id from vw) is not null
              and i.play_format_id is not distinct from (select vw.play_format_id from vw)
            then 8.0::float8 else 0::float8 end
        + case
            when (select vw.fandom_era_id from vw) is not null
              and i.fandom_era_id is not distinct from (select vw.fandom_era_id from vw)
            then 5.0::float8 else 0::float8 end
        + case
            when (select vw.fandom_set_id from vw) is not null
              and i.fandom_set_id is not distinct from (select vw.fandom_set_id from vw)
            then 5.0::float8 else 0::float8 end
        + greatest(
            0::float8,
            (45.0::float8 - least(coalesce(i.active_within_days, 999)::float8, 999::float8)) * 0.08::float8
          )
      )::float8 as rnk
    from public.user_search_index i
    inner join public.social_public_profiles sp on sp.user_id = i.user_id
    left join public.user_persona_cache pc on pc.user_id = i.user_id
    left join lateral (
      select x.score::float8 as score
      from public.user_similarity_cache c
      cross join lateral unnest(c.similar_user_ids, c.similarity_scores) as x(uid, score)
      where p_viewer_id is not null
        and c.user_id = p_viewer_id
        and x.uid = i.user_id
      limit 1
    ) sim on true
    where (p_viewer_id is null or i.user_id <> p_viewer_id)
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'playFormatId', '')) = ''
        or i.play_format_id = trim(p_filters->>'playFormatId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'playArchetypeId', '')) = ''
        or i.play_archetype_id = trim(p_filters->>'playArchetypeId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'fandomEraId', '')) = ''
        or i.fandom_era_id = trim(p_filters->>'fandomEraId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'fandomSetId', '')) = ''
        or i.fandom_set_id = trim(p_filters->>'fandomSetId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'fandomArtistId', '')) = ''
        or i.fandom_artist_id = trim(p_filters->>'fandomArtistId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'fandomCharacterId', '')) = ''
        or i.fandom_character_id = trim(p_filters->>'fandomCharacterId')
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'fandomThemeId', '')) = ''
        or i.fandom_theme_id = trim(p_filters->>'fandomThemeId')
      )
      and (
        p_filters is null
        or p_filters->>'valueBandMin' is null
        or i.value_band >= (p_filters->>'valueBandMin')::int
      )
      and (
        p_filters is null
        or p_filters->>'valueBandMax' is null
        or i.value_band <= (p_filters->>'valueBandMax')::int
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'rarityProfile', '')) = ''
        or i.rarity_profile = trim(p_filters->>'rarityProfile')
      )
      and (
        p_filters is null
        or p_filters->>'minBinderComplete' is null
        or i.binder_complete_count >= (p_filters->>'minBinderComplete')::int
      )
      and (
        p_filters is null
        or p_filters->>'minSetComplete' is null
        or i.set_complete_count >= (p_filters->>'minSetComplete')::int
      )
      and (
        p_filters is null
        or p_filters->'completedJourneyIds' is null
        or jsonb_typeof(p_filters->'completedJourneyIds') <> 'array'
        or cardinality(
          i.journey_complete_ids
          & array(select jsonb_array_elements_text(p_filters->'completedJourneyIds'))
        ) > 0
      )
      and (
        p_filters is null
        or p_filters->>'tradeTierMin' is null
        or i.trade_tier >= (p_filters->>'tradeTierMin')::int
      )
      and (
        p_filters is null
        or p_filters->>'tradeTierMax' is null
        or i.trade_tier <= (p_filters->>'tradeTierMax')::int
      )
      and (
        p_filters is null
        or p_filters->'clubIds' is null
        or jsonb_typeof(p_filters->'clubIds') <> 'array'
        or cardinality(
          i.club_ids & array(select jsonb_array_elements_text(p_filters->'clubIds'))
        ) > 0
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'personaQuery', '')) = ''
        or i.persona_tokens @@ plainto_tsquery('english', trim(p_filters->>'personaQuery'))
      )
      and (
        p_filters is null
        or trim(coalesce(p_filters->>'presenceState', '')) = ''
        or i.presence_state = trim(p_filters->>'presenceState')
      )
      and (
        p_filters is null
        or p_filters->>'activeWithinDaysMax' is null
        or (
          i.active_within_days is not null
          and i.active_within_days <= (p_filters->>'activeWithinDaysMax')::int
        )
      )
      and (
        p_filters is null
        or p_filters->'seasonalEventIds' is null
        or jsonb_typeof(p_filters->'seasonalEventIds') <> 'array'
        or cardinality(
          i.seasonal_event_ids
          & array(select jsonb_array_elements_text(p_filters->'seasonalEventIds'))
        ) > 0
      )
      and (
        p_filters is null
        or p_filters->>'minEventsLast7Days' is null
        or i.events_last_7d >= (p_filters->>'minEventsLast7Days')::int
      )
      and (
        p_filters is null
        or p_filters->>'minEventsLast30Days' is null
        or i.events_last_30d >= (p_filters->>'minEventsLast30Days')::int
      )
  )
  select
    m.uid,
    m.rnk,
    m.sim_score,
    m.p_text,
    m.dsp,
    m.usr,
    m.hdl,
    m.av,
    m.pst,
    m.adays,
    m.pclub,
    m.cids,
    m.ev7,
    m.ev30,
    m.pfmt,
    m.parch,
    m.pfe,
    m.vb,
    m.tt
  from matched m
  order by m.rnk desc nulls last, m.uid asc
  limit lim offset off;
end;
$$;

revoke all on function public.search_collectors(jsonb, int, int, uuid) from public;
grant execute on function public.search_collectors(jsonb, int, int, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_search_filter_options — catalog ids for filters (mirror TS catalogs)
-- ---------------------------------------------------------------------------

create or replace function public.get_search_filter_options()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'playFormats', '["commander","standard","modern","vintage","pioneer","pauper","legacy","limited"]'::jsonb,
    'playArchetypes', '["aggro","control","midrange","combo","tribal","tempo","ramp","stax","burn"]'::jsonb,
    'presenceStates', '["online","recent","offline"]'::jsonb,
    'valueBands', '[0,1,2,3,4]'::jsonb,
    'tradeTiers', '[0,1,2,3]'::jsonb,
    'rarityProfiles', '["High-rarity heavy","Unique-focused","Bulk-focused","Balanced"]'::jsonb,
    'seasonalEventIds', '["spring_2026_collector","summer_2026_scan_sprint","holiday_2026_collector"]'::jsonb,
    'clubIds', coalesce(
      (select jsonb_agg(distinct uc.club_id order by uc.club_id) from public.user_clubs uc),
      '[]'::jsonb
    ),
    'journeyIds', '["first_50_scans","first_500_scans","first_binder_complete","ten_unique_sets","seven_day_streak","first_seasonal_badge","thousand_reputation"]'::jsonb
  );
$$;

revoke all on function public.get_search_filter_options() from public;
grant execute on function public.get_search_filter_options() to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.trg_refresh_user_search_index_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.user_id, old.user_id);
  if uid is not null then
    perform public.refresh_user_search_index(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_refresh_user_search_index_row() from public;

drop trigger if exists tr_user_search_persona on public.user_persona_cache;
create trigger tr_user_search_persona
  after insert or update on public.user_persona_cache
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_play on public.user_play_identity;
create trigger tr_user_search_play
  after insert or update on public.user_play_identity
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_fandom on public.user_fandom_identity;
create trigger tr_user_search_fandom
  after insert or update on public.user_fandom_identity
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_value on public.user_collection_value_cache;
create trigger tr_user_search_value
  after insert or update on public.user_collection_value_cache
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_mastery on public.user_collection_mastery;
create trigger tr_user_search_mastery
  after insert or update on public.user_collection_mastery
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_journey on public.user_journey_progress;
create trigger tr_user_search_journey
  after insert or update on public.user_journey_progress
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_trade on public.user_trade_reputation;
create trigger tr_user_search_trade
  after insert or update on public.user_trade_reputation
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_clubs on public.user_clubs;
create trigger tr_user_search_clubs
  after insert or delete on public.user_clubs
  for each row execute function public.trg_refresh_user_search_index_row();

drop trigger if exists tr_user_search_presence on public.user_presence;
create trigger tr_user_search_presence
  after insert or update on public.user_presence
  for each row execute function public.trg_refresh_user_search_index_row();

create or replace function public.trg_refresh_user_search_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_search_index_activity_throttled(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_refresh_user_search_activity() from public;

drop trigger if exists tr_user_search_activity on public.user_activity_log;
create trigger tr_user_search_activity
  after insert on public.user_activity_log
  for each row execute function public.trg_refresh_user_search_activity();

create or replace function public.trg_refresh_user_search_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null
     and (
       new.badge_type = 'seasonal_event'
       or new.badge_type = 'trade_reputation'
     ) then
    perform public.refresh_user_search_index(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_refresh_user_search_badges() from public;

drop trigger if exists tr_user_search_badges on public.user_badges;
create trigger tr_user_search_badges
  after insert on public.user_badges
  for each row execute function public.trg_refresh_user_search_badges();

notify pgrst, 'reload schema';
