-- Phase 28: Collector archetypes — qualitative taste vectors & persona v2 (no public numeric scores).
-- Vectors are server-only; RPCs expose archetype labels + confidence bands only.

-- ---------------------------------------------------------------------------
-- Catalog (public qualitative metadata)
-- ---------------------------------------------------------------------------

create table if not exists public.archetype_catalog (
  archetype_id text primary key,
  label text not null,
  description text not null,
  icon_key text not null
);

comment on table public.archetype_catalog is
  'Collector persona archetypes — qualitative copy for Profile & social tooltips.';

insert into public.archetype_catalog (archetype_id, label, description, icon_key)
values
  (
    'archivist',
    'The Archivist',
    'Completion-first collecting — binders and sets brought to the finish line.',
    'archetype.archivist'
  ),
  (
    'trader',
    'The Trader',
    'Market energy — trades, feedback, and dependable swaps.',
    'archetype.trader'
  ),
  (
    'explorer',
    'The Explorer',
    'Discovery-led — scans, seasons, and staying curious about what is next.',
    'archetype.explorer'
  ),
  (
    'strategist',
    'The Strategist',
    'Play-forward — formats, deck identity, and tuned lists.',
    'archetype.strategist'
  ),
  (
    'historian',
    'The Historian',
    'Era-anchored taste — favorite generations and set storytelling.',
    'archetype.historian'
  ),
  (
    'social_collector',
    'The Social Collector',
    'Community threads — clubs, rooms, posts, and showing up for others.',
    'archetype.social'
  )
on conflict (archetype_id) do update set
  label = excluded.label,
  description = excluded.description,
  icon_key = excluded.icon_key;

alter table public.archetype_catalog enable row level security;

drop policy if exists "archetype_catalog_select_authenticated" on public.archetype_catalog;
create policy "archetype_catalog_select_authenticated"
  on public.archetype_catalog for select to authenticated using (true);

grant select on table public.archetype_catalog to authenticated;

-- ---------------------------------------------------------------------------
-- Taste vector (internal qualitative axes — never exposed via RPC)
-- ---------------------------------------------------------------------------

create table if not exists public.user_taste_vectors (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  vector jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_taste_vectors is
  'Qualitative taste axes for archetype refresh — not returned to clients.';

alter table public.user_taste_vectors enable row level security;

revoke all on table public.user_taste_vectors from public;
revoke all on table public.user_taste_vectors from anon;
revoke all on table public.user_taste_vectors from authenticated;

grant all on table public.user_taste_vectors to service_role;

-- ---------------------------------------------------------------------------
-- User archetypes (public qualitative fits)
-- ---------------------------------------------------------------------------

create table if not exists public.user_archetypes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  archetype_id text not null references public.archetype_catalog (archetype_id) on delete cascade,
  confidence_band text not null
    check (confidence_band in ('Strong fit', 'Good fit', 'Light fit', 'Emerging')),
  updated_at timestamptz not null default now(),
  primary key (user_id, archetype_id)
);

create index if not exists user_archetypes_user_updated_idx
  on public.user_archetypes (user_id, updated_at desc);

comment on table public.user_archetypes is
  'Qualitative archetype fits per collector — refreshed server-side; no numeric scores stored.';

alter table public.user_archetypes enable row level security;

drop policy if exists "user_archetypes_select_authenticated" on public.user_archetypes;
create policy "user_archetypes_select_authenticated"
  on public.user_archetypes for select to authenticated using (true);

grant select on table public.user_archetypes to authenticated;

revoke insert, update, delete on table public.user_archetypes from authenticated;
grant all on table public.user_archetypes to service_role;

-- ---------------------------------------------------------------------------
-- Qualitative tier helpers (internal)
-- ---------------------------------------------------------------------------

create or replace function public._mca_ql3(p_n bigint, p_lo bigint, p_hi bigint)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when coalesce(p_n, 0) >= coalesce(p_hi, 999999) then 'high'
    when coalesce(p_n, 0) >= coalesce(p_lo, 0) then 'medium'
    else 'low'
  end;
$$;

revoke all on function public._mca_ql3(bigint, bigint, bigint) from public;

-- ---------------------------------------------------------------------------
-- refresh_user_taste_vector
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_taste_vector(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mastery_complete bigint;
  v_mastery_total bigint;
  v_scans bigint;
  v_hi bigint;
  v_tot_cards bigint;
  v_rep_max double precision;
  v_infl_max double precision;
  v_seasonal bigint;
  v_clubs bigint;
  v_rooms bigint;
  v_trades int;
  v_pos int;
  v_posts bigint;
  v_comments bigint;
  v_ratio numeric;
  v_vec jsonb;
begin
  if p_user_id is null then
    return;
  end if;

  select
    count(*) filter (where u.is_complete)::bigint,
    count(*)::bigint
  into v_mastery_complete, v_mastery_total
  from public.user_collection_mastery u
  where u.user_id = p_user_id;

  select count(*)::bigint into v_scans
  from public.scan_events s
  where s.user_id = p_user_id
    and s.created_at > (now() - interval '90 days');

  select coalesce(c.high_rarity_count, 0)::bigint, coalesce(c.total_cards, 0)::bigint
  into v_hi, v_tot_cards
  from public.user_collection_value_cache c
  where c.user_id = p_user_id;

  if v_tot_cards is null then
    v_tot_cards := 0;
    v_hi := 0;
  end if;

  select greatest(
    coalesce(g.helpfulness_score, 0),
    coalesce(g.expertise_score, 0),
    coalesce(g.positivity_score, 0),
    coalesce(g.reliability_score, 0),
    coalesce(g.contribution_score, 0)
  ) into v_rep_max
  from public.user_reputation_graph g
  where g.user_id = p_user_id;

  select greatest(
    coalesce(g.identity_reach_score, 0),
    coalesce(g.contribution_reach_score, 0),
    coalesce(g.expertise_reach_score, 0),
    coalesce(g.social_reach_score, 0),
    coalesce(g.seasonal_reach_score, 0)
  ) into v_infl_max
  from public.user_influence_graph g
  where g.user_id = p_user_id;

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation se
  where se.user_id = p_user_id;

  select count(*)::bigint into v_clubs
  from public.user_clubs uc
  where uc.user_id = p_user_id;

  select count(distinct crm.room_id)::bigint into v_rooms
  from public.collector_room_members crm
  inner join public.collector_rooms cr on cr.room_id = crm.room_id
  where crm.user_id = p_user_id
    and crm.last_seen_at > (now() - interval '30 days')
    and cr.expires_at > now();

  select
    coalesce(r.completed_trades_count, 0),
    coalesce(r.positive_feedback_count, 0)
  into v_trades, v_pos
  from public.user_trade_reputation r
  where r.user_id = p_user_id;

  if v_trades is null then
    v_trades := 0;
    v_pos := 0;
  end if;

  select count(*)::bigint into v_posts
  from public.community_posts cp
  where cp.author_id = p_user_id;

  select count(*)::bigint into v_comments
  from public.community_post_comments cc
  where cc.author_id = p_user_id;

  v_ratio := case when coalesce(v_tot_cards, 0) > 0
    then (v_hi::numeric / v_tot_cards::numeric)
    else 0::numeric end;

  v_vec := jsonb_build_object(
    'mastery_focus', public._mca_ql3(coalesce(v_mastery_complete, 0), 1, 4),
    'set_mastery_shape', case
      when coalesce(v_mastery_total, 0) >= 8 then 'broad'
      when coalesce(v_mastery_total, 0) >= 3 then 'mixed'
      else 'focused'
    end,
    'scan_momentum', public._mca_ql3(coalesce(v_scans, 0), 5, 40),
    'rarity_profile', case
      when coalesce(v_tot_cards, 0) = 0 then 'unknown'
      when v_ratio > 0.12 then 'premium_focused'
      when v_ratio > 0.02 then 'balanced'
      else 'core_focused'
    end,
    'reputation_signal', case
      when coalesce(v_rep_max, 0) >= 55 then 'high'
      when coalesce(v_rep_max, 0) >= 30 then 'medium'
      else 'low'
    end,
    'influence_signal', case
      when coalesce(v_infl_max, 0) >= 55 then 'high'
      when coalesce(v_infl_max, 0) >= 30 then 'medium'
      else 'low'
    end,
    'seasonal_touch', public._mca_ql3(coalesce(v_seasonal, 0), 1, 4),
    'club_ties', public._mca_ql3(coalesce(v_clubs, 0), 1, 3),
    'room_wander', public._mca_ql3(coalesce(v_rooms, 0), 1, 4),
    'trade_signal', case
      when coalesce(v_trades, 0) >= 6 or coalesce(v_pos, 0) >= 8 then 'high'
      when coalesce(v_trades, 0) >= 2 or coalesce(v_pos, 0) >= 3 then 'medium'
      else 'low'
    end,
    'community_voice', public._mca_ql3(coalesce(v_posts, 0) + coalesce(v_comments, 0), 1, 12),
    'identity_cluster', case
      when coalesce(v_clubs, 0) >= 2 and coalesce(v_seasonal, 0) >= 2 then 'seasoned_regular'
      when coalesce(v_scans, 0) >= 30 then 'scanner_forward'
      when coalesce(v_mastery_complete, 0) >= 2 then 'completion_minded'
      else 'emerging'
    end,
    'behavior_fingerprint', case
      when coalesce(v_posts, 0) + coalesce(v_comments, 0) >= 10 then 'community_forward'
      when coalesce(v_rooms, 0) >= 2 then 'ambient_wanderer'
      when coalesce(v_scans, 0) >= 20 then 'scanner_rhythm'
      else 'quiet_curator'
    end
  );

  insert into public.user_taste_vectors (user_id, vector, updated_at)
  values (p_user_id, v_vec, now())
  on conflict (user_id) do update set
    vector = excluded.vector,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_taste_vector(uuid) from public;
grant execute on function public.refresh_user_taste_vector(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_archetypes
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_archetypes(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mastery_complete bigint;
  v_mastery_total bigint;
  v_set_complete bigint;
  v_scans bigint;
  v_seasonal bigint;
  v_clubs bigint;
  v_rooms bigint;
  v_trades int;
  v_pos int;
  v_posts bigint;
  v_comments bigint;
  v_deck_count bigint;
  v_fav_arch text;
  v_fav_fmt text;
  v_fav_era text;
  s_archivist int;
  s_trader int;
  s_explorer int;
  s_strategist int;
  s_historian int;
  s_social int;
  r record;
  v_band text;
begin
  if p_user_id is null then
    return;
  end if;

  perform public.refresh_user_taste_vector(p_user_id);

  select
    count(*) filter (where u.is_complete)::bigint,
    count(*)::bigint,
    count(*) filter (where u.mastery_type = 'set' and u.is_complete)::bigint
  into v_mastery_complete, v_mastery_total, v_set_complete
  from public.user_collection_mastery u
  where u.user_id = p_user_id;

  select count(*)::bigint into v_scans
  from public.scan_events s
  where s.user_id = p_user_id
    and s.created_at > (now() - interval '90 days');

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation se
  where se.user_id = p_user_id;

  select count(*)::bigint into v_clubs
  from public.user_clubs uc
  where uc.user_id = p_user_id;

  select count(distinct crm.room_id)::bigint into v_rooms
  from public.collector_room_members crm
  inner join public.collector_rooms cr on cr.room_id = crm.room_id
  where crm.user_id = p_user_id
    and crm.last_seen_at > (now() - interval '30 days')
    and cr.expires_at > now();

  select
    coalesce(r.completed_trades_count, 0),
    coalesce(r.positive_feedback_count, 0)
  into v_trades, v_pos
  from public.user_trade_reputation r
  where r.user_id = p_user_id;

  if v_trades is null then
    v_trades := 0;
    v_pos := 0;
  end if;

  select count(*)::bigint into v_posts
  from public.community_posts cp
  where cp.author_id = p_user_id;

  select count(*)::bigint into v_comments
  from public.community_post_comments cc
  where cc.author_id = p_user_id;

  select count(*)::bigint into v_deck_count
  from public.user_deck_stats d
  where d.user_id = p_user_id;

  select
    p.favorite_archetype_id,
    p.favorite_format_id
  into v_fav_arch, v_fav_fmt
  from public.user_play_identity p
  where p.user_id = p_user_id;

  select f.favorite_era_id into v_fav_era
  from public.user_fandom_identity f
  where f.user_id = p_user_id;

  s_archivist := least(100,
    coalesce(v_mastery_complete, 0)::int * 9
    + case when coalesce(v_mastery_total, 0) > 0
      then (100 * coalesce(v_mastery_complete, 0) / greatest(v_mastery_total, 1))::int / 3
      else 0 end
    + coalesce(v_set_complete, 0)::int * 5
  );

  s_trader := least(100, v_trades * 10 + v_pos * 4 + case when v_trades >= 3 then 15 else 0 end);

  s_explorer := least(100,
    (coalesce(v_scans, 0)::int / 4)
    + coalesce(v_seasonal, 0)::int * 5
    + coalesce(v_rooms, 0)::int * 4
    + case when coalesce(v_scans, 0) >= 25 then 12 else 0 end
  );

  s_strategist := least(100,
    case when v_fav_arch is not null and length(trim(v_fav_arch)) > 0 then 38 else 0 end
    + case when v_fav_fmt is not null and length(trim(v_fav_fmt)) > 0 then 18 else 0 end
    + case when coalesce(v_deck_count, 0) >= 3 then 35 when coalesce(v_deck_count, 0) >= 1 then 20 else 0 end
  );

  s_historian := least(100,
    case when v_fav_era is not null and length(trim(v_fav_era)) > 0 then 42 else 0 end
    + coalesce(v_set_complete, 0)::int * 8
    + case when coalesce(v_mastery_total, 0) >= 6 then 18 else 0 end
  );

  s_social := least(100,
    coalesce(v_clubs, 0)::int * 10
    + least(40, (coalesce(v_posts, 0) + coalesce(v_comments, 0))::int * 3)
    + coalesce(v_rooms, 0)::int * 5
  );

  delete from public.user_archetypes where user_id = p_user_id;

  for r in
    select x.* from (
      select 'archivist'::text as aid, s_archivist as sc
      union all select 'trader', s_trader
      union all select 'explorer', s_explorer
      union all select 'strategist', s_strategist
      union all select 'historian', s_historian
      union all select 'social_collector', s_social
    ) x
    order by x.sc desc
  loop
    v_band := case
      when r.sc >= 72 then 'Strong fit'
      when r.sc >= 52 then 'Good fit'
      when r.sc >= 34 then 'Light fit'
      else 'Emerging'
    end;

    insert into public.user_archetypes (user_id, archetype_id, confidence_band, updated_at)
    values (p_user_id, r.aid, v_band, now());
  end loop;
end;
$$;

revoke all on function public.refresh_user_archetypes(uuid) from public;
grant execute on function public.refresh_user_archetypes(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPCs (qualitative reads)
-- ---------------------------------------------------------------------------

create or replace function public._collector_archetypes_need_refresh(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select
      count(*) = 0
      or max(ua.updated_at) < (now() - interval '36 hours')
    from public.user_archetypes ua
    where ua.user_id = p_user_id),
    true
  );
$$;

revoke all on function public._collector_archetypes_need_refresh(uuid) from public;

create or replace function public.get_user_archetypes(p_user_id uuid)
returns table (
  archetype_id text,
  label text,
  description text,
  icon_key text,
  confidence_band text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if public._collector_archetypes_need_refresh(p_user_id) then
    perform public.refresh_user_archetypes(p_user_id);
  end if;

  return query
  select
    c.archetype_id,
    c.label,
    c.description,
    c.icon_key,
    ua.confidence_band
  from public.user_archetypes ua
  inner join public.archetype_catalog c on c.archetype_id = ua.archetype_id
  where ua.user_id = p_user_id
  order by
    case ua.confidence_band
      when 'Strong fit' then 1
      when 'Good fit' then 2
      when 'Light fit' then 3
      else 4
    end,
    ua.updated_at desc;
end;
$$;

revoke all on function public.get_user_archetypes(uuid) from public;
grant execute on function public.get_user_archetypes(uuid) to authenticated;

create or replace function public.get_users_archetypes_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  archetype_id text,
  label text,
  description text,
  icon_key text,
  confidence_band text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if p_user_ids is null then
    return;
  end if;

  foreach uid in array p_user_ids
  loop
    if uid is not null and public._collector_archetypes_need_refresh(uid) then
      perform public.refresh_user_archetypes(uid);
    end if;
  end loop;

  return query
  select
    ua.user_id,
    c.archetype_id,
    c.label,
    c.description,
    c.icon_key,
    ua.confidence_band
  from public.user_archetypes ua
  inner join public.archetype_catalog c on c.archetype_id = ua.archetype_id
  where ua.user_id = any (p_user_ids)
  order by
    ua.user_id,
    case ua.confidence_band
      when 'Strong fit' then 1
      when 'Good fit' then 2
      when 'Light fit' then 3
      else 4
    end,
    ua.updated_at desc;
end;
$$;

revoke all on function public.get_users_archetypes_batch(uuid[]) from public;
grant execute on function public.get_users_archetypes_batch(uuid[]) to authenticated;

create or replace function public.get_archetype_spotlights(p_limit int default 3)
returns table (
  archetype_id text,
  label text,
  description text,
  icon_key text,
  spotlight_note text
)
language sql
stable
security definer
set search_path = public
as $$
  with lim as (
    select greatest(1, least(coalesce(p_limit, 3), 12))::int as n
  )
  select
    c.archetype_id,
    c.label,
    c.description,
    c.icon_key,
    trim(both from split_part(c.description, '.', 1)) || '.'::text as spotlight_note
  from public.archetype_catalog c
  cross join lim
  order by md5(c.archetype_id || ':' || (current_date)::text), c.archetype_id
  limit (select n from lim);
$$;

revoke all on function public.get_archetype_spotlights(int) from public;
grant execute on function public.get_archetype_spotlights(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Keep archetypes loosely fresh when persona line regenerates
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_persona_cache_refresh_archetypes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_archetypes(new.user_id);
  return new;
end;
$$;

revoke all on function public.tr_user_persona_cache_refresh_archetypes() from public;

drop trigger if exists tr_persona_cache_refresh_archetypes on public.user_persona_cache;
create trigger tr_persona_cache_refresh_archetypes
  after insert or update on public.user_persona_cache
  for each row execute function public.tr_user_persona_cache_refresh_archetypes();
