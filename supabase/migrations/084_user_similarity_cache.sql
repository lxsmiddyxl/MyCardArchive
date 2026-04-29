-- Social graph similarity cache — top similar collectors per user.
-- Weight math mirrors src/lib/social-graph/similarity-weights.ts (raw sum max 80 → scaled 0–100).

create table if not exists public.user_similarity_cache (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  similar_user_ids uuid[] not null default array[]::uuid[],
  similarity_scores float8[] not null default array[]::float8[],
  updated_at timestamptz not null default now()
);

comment on table public.user_similarity_cache is
  'Top-N similar trainers — recomputed server-side via refresh_user_similarity only.';

alter table public.user_similarity_cache enable row level security;

revoke all on table public.user_similarity_cache from public;
revoke all on table public.user_similarity_cache from anon;
revoke all on table public.user_similarity_cache from authenticated;

grant all on table public.user_similarity_cache to service_role;

-- Raw score 0..80 — aligned with SIMILARITY_AXIS_MAX sum in similarity-weights.ts
create or replace function public._collector_similarity_raw_score(p_a uuid, p_b uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  fa text;
  aa text;
  fb text;
  ab text;
  s_play numeric := 0;
  fandom_hits int := 0;
  s_fan numeric := 0;
  va text;
  vb text;
  s_val numeric := 0;
  ta text;
  tb text;
  tr_a text;
  tr_b text;
  s_trade numeric := 0;
  maj int;
  mua int;
  mub int;
  s_m numeric := 0;
  saj int;
  suj int;
  s_j numeric := 0;
  jna int;
  jnb int;
  sas int;
  sus int;
  s_s numeric := 0;
  sna int;
  snb int;
  sg int;
  mga int;
  mgb int;
  s_g numeric := 0;
  raw numeric;
begin
  if p_a is null or p_b is null or p_a = p_b then
    return 0;
  end if;

  select favorite_format_id, favorite_archetype_id into fa, aa from public.user_play_identity where user_id = p_a;
  select favorite_format_id, favorite_archetype_id into fb, ab from public.user_play_identity where user_id = p_b;
  if lower(trim(coalesce(fa,''))) = lower(trim(coalesce(fb,''))) and trim(coalesce(fa,'')) <> '' then
    s_play := s_play + 5;
  end if;
  if lower(trim(coalesce(aa,''))) = lower(trim(coalesce(ab,''))) and trim(coalesce(aa,'')) <> '' then
    s_play := s_play + 5;
  end if;
  s_play := least(10, s_play);

  if lower(trim(coalesce(
    (select favorite_set_id from public.user_fandom_identity where user_id = p_a),''
  ))) = lower(trim(coalesce(
    (select favorite_set_id from public.user_fandom_identity where user_id = p_b),''
  ))) and trim(coalesce((select favorite_set_id from public.user_fandom_identity where user_id = p_a),'')) <> '' then
    fandom_hits := fandom_hits + 1;
  end if;
  if lower(trim(coalesce(
    (select favorite_era_id from public.user_fandom_identity where user_id = p_a),''
  ))) = lower(trim(coalesce(
    (select favorite_era_id from public.user_fandom_identity where user_id = p_b),''
  ))) and trim(coalesce((select favorite_era_id from public.user_fandom_identity where user_id = p_a),'')) <> '' then
    fandom_hits := fandom_hits + 1;
  end if;
  if lower(trim(coalesce(
    (select favorite_artist_id from public.user_fandom_identity where user_id = p_a),''
  ))) = lower(trim(coalesce(
    (select favorite_artist_id from public.user_fandom_identity where user_id = p_b),''
  ))) and trim(coalesce((select favorite_artist_id from public.user_fandom_identity where user_id = p_a),'')) <> '' then
    fandom_hits := fandom_hits + 1;
  end if;
  if lower(trim(coalesce(
    (select favorite_character_id from public.user_fandom_identity where user_id = p_a),''
  ))) = lower(trim(coalesce(
    (select favorite_character_id from public.user_fandom_identity where user_id = p_b),''
  ))) and trim(coalesce((select favorite_character_id from public.user_fandom_identity where user_id = p_a),'')) <> '' then
    fandom_hits := fandom_hits + 1;
  end if;
  if lower(trim(coalesce(
    (select favorite_theme_id from public.user_fandom_identity where user_id = p_a),''
  ))) = lower(trim(coalesce(
    (select favorite_theme_id from public.user_fandom_identity where user_id = p_b),''
  ))) and trim(coalesce((select favorite_theme_id from public.user_fandom_identity where user_id = p_a),'')) <> '' then
    fandom_hits := fandom_hits + 1;
  end if;
  s_fan := least(10, fandom_hits * 2);

  select
    case
      when coalesce(estimated_value_cents,0) >= 100000 then 'high_value_collector'
      when coalesce(high_rarity_count,0) >= 25 then 'rarity_hunter'
      when coalesce(unique_cards,0) >= 250 then 'unique_collector'
      else null
    end
    into va
  from public.user_collection_value_cache where user_id = p_a;

  select
    case
      when coalesce(estimated_value_cents,0) >= 100000 then 'high_value_collector'
      when coalesce(high_rarity_count,0) >= 25 then 'rarity_hunter'
      when coalesce(unique_cards,0) >= 250 then 'unique_collector'
      else null
    end
    into vb
  from public.user_collection_value_cache where user_id = p_b;

  if va is not null and vb is not null and va = vb then
    s_val := 10;
  elsif va is not null or vb is not null then
    s_val := greatest(0, 10 - abs(
      coalesce((case va when 'high_value_collector' then 0 when 'rarity_hunter' then 1 when 'unique_collector' then 2 else 3 end), 3)
      - coalesce((case vb when 'high_value_collector' then 0 when 'rarity_hunter' then 1 when 'unique_collector' then 2 else 3 end), 3)
    ) * 3);
  end if;

  select tier_slug into ta from public.social_public_profiles where user_id = p_a;
  select tier_slug into tb from public.social_public_profiles where user_id = p_b;

  tr_a := null;
  if exists (select 1 from public.user_trade_reputation r where r.user_id = p_a and coalesce(r.completed_trades_count,0) > 0) then
    select
      case
        when lower(trim(coalesce(ta,''))) = 'business'
          and r.completed_trades_count >= 20
          and (r.positive_feedback_count::numeric / greatest(r.completed_trades_count,1)) >= 0.90 then 'reliable_shop'
        when r.completed_trades_count >= 50 then 'veteran_trader'
        when r.completed_trades_count >= 10
          and (r.positive_feedback_count::numeric / greatest(r.completed_trades_count,1)) >= 0.85 then 'trusted_trader'
        else null
      end into tr_a
    from public.user_trade_reputation r where r.user_id = p_a;
  end if;

  tr_b := null;
  if exists (select 1 from public.user_trade_reputation r where r.user_id = p_b and coalesce(r.completed_trades_count,0) > 0) then
    select
      case
        when lower(trim(coalesce(tb,''))) = 'business'
          and r.completed_trades_count >= 20
          and (r.positive_feedback_count::numeric / greatest(r.completed_trades_count,1)) >= 0.90 then 'reliable_shop'
        when r.completed_trades_count >= 50 then 'veteran_trader'
        when r.completed_trades_count >= 10
          and (r.positive_feedback_count::numeric / greatest(r.completed_trades_count,1)) >= 0.85 then 'trusted_trader'
        else null
      end into tr_b
    from public.user_trade_reputation r where r.user_id = p_b;
  end if;

  if tr_a is not null and tr_b is not null and tr_a = tr_b then
    s_trade := 10;
  elsif tr_a is not null and tr_b is not null then
    s_trade := greatest(0, 10 - abs(
      (case tr_a when 'reliable_shop' then 0 when 'veteran_trader' then 1 when 'trusted_trader' then 2 else 3 end)
      - (case tr_b when 'reliable_shop' then 0 when 'veteran_trader' then 1 when 'trusted_trader' then 2 else 3 end)
    ) * 4);
  elsif tr_a is not null or tr_b is not null then
    s_trade := 4;
  end if;

  select count(*) into maj
  from (
    select distinct mastery_type::text || ':' || mastery_key::text as k
    from public.user_collection_mastery
    where user_id = p_a and is_complete
    intersect
    select distinct mastery_type::text || ':' || mastery_key::text as k
    from public.user_collection_mastery
    where user_id = p_b and is_complete
  ) x;

  select count(*) into mua from public.user_collection_mastery where user_id = p_a and is_complete;
  select count(*) into mub from public.user_collection_mastery where user_id = p_b and is_complete;
  if coalesce(mua,0) + coalesce(mub,0) - maj > 0 then
    s_m := round((maj::numeric / greatest(mua + mub - maj, 1)) * 10);
  else
    s_m := 0;
  end if;

  select count(*) into saj
  from (
    select journey_id from public.user_journey_progress where user_id = p_a and is_complete
    intersect
    select journey_id from public.user_journey_progress where user_id = p_b and is_complete
  ) z;

  select count(*) into jna from public.user_journey_progress where user_id = p_a and is_complete;
  select count(*) into jnb from public.user_journey_progress where user_id = p_b and is_complete;
  suj := coalesce(jna,0) + coalesce(jnb,0) - saj;
  if suj > 0 then
    s_j := round((saj::numeric / greatest(suj, 1)) * 10);
  else
    s_j := 0;
  end if;

  select count(*) into sas
  from (
    select badge_key from public.user_badges where user_id = p_a and badge_type = 'seasonal_event'
    intersect
    select badge_key from public.user_badges where user_id = p_b and badge_type = 'seasonal_event'
  ) z2;

  select count(*) into sna from public.user_badges where user_id = p_a and badge_type = 'seasonal_event';
  select count(*) into snb from public.user_badges where user_id = p_b and badge_type = 'seasonal_event';
  sus := coalesce(sna,0) + coalesce(snb,0) - sas;
  if sus > 0 then
    s_s := round((sas::numeric / greatest(sus, 1)) * 10);
  else
    s_s := 0;
  end if;

  select count(*) into sg
  from (
    select c.catalog_card_id
    from public.user_grail_cards g
    join public.cards c on c.id = g.card_id
    where g.user_id = p_a and c.catalog_card_id is not null
    intersect
    select c.catalog_card_id
    from public.user_grail_cards g
    join public.cards c on c.id = g.card_id
    where g.user_id = p_b and c.catalog_card_id is not null
  ) q;

  select greatest(count(*), 1) into mga
  from public.user_grail_cards g
  join public.cards c on c.id = g.card_id
  where g.user_id = p_a and c.catalog_card_id is not null;

  select greatest(count(*), 1) into mgb
  from public.user_grail_cards g
  join public.cards c on c.id = g.card_id
  where g.user_id = p_b and c.catalog_card_id is not null;

  if sg > 0 then
    s_g := round(least(1.0, sg::numeric / greatest(least(mga, mgb), 1)) * 10);
  else
    s_g := 0;
  end if;

  raw := coalesce(s_play,0) + coalesce(s_fan,0) + coalesce(s_val,0) + coalesce(s_m,0) + coalesce(s_g,0)
       + coalesce(s_j,0) + coalesce(s_s,0) + coalesce(s_trade,0);
  return least(80, greatest(0, raw));
end;
$$;

revoke all on function public._collector_similarity_raw_score(uuid, uuid) from public;

create or replace function public.refresh_user_similarity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cand record;
  pairs uuid[] := array[]::uuid[];
  scores float8[] := array[]::float8[];
  r numeric;
  lim int := 20;
  sc float8;
begin
  if p_user_id is null then
    return;
  end if;

  for cand in
    with foaf as (
      select distinct uf2.following_id as cid
      from public.user_follows uf1
      join public.user_follows uf2 on uf2.follower_id = uf1.following_id
      where uf1.follower_id = p_user_id
        and uf2.following_id is distinct from p_user_id
      limit 120
    ),
    recent as (
      select user_id as cid
      from public.social_public_profiles
      where user_id is distinct from p_user_id
      order by joined_at desc nulls last
      limit 120
    ),
    pool as (
      select distinct cid from (
        select cid from foaf
        union all
        select cid from recent
      ) z
      limit 280
    )
    select cid from pool
  loop
    r := public._collector_similarity_raw_score(p_user_id, cand.cid);
    if coalesce(r, 0) <= 0 then
      continue;
    end if;
    sc := round(least(100.0, (r / 80.0) * 100.0))::float8;
    pairs := array_append(pairs, cand.cid);
    scores := array_append(scores, sc);
  end loop;

  if array_length(pairs, 1) is null then
    insert into public.user_similarity_cache (user_id, similar_user_ids, similarity_scores, updated_at)
    values (p_user_id, array[]::uuid[], array[]::float8[], now())
    on conflict (user_id) do update set
      similar_user_ids = excluded.similar_user_ids,
      similarity_scores = excluded.similarity_scores,
      updated_at = excluded.updated_at;
    return;
  end if;

  with deduped as (
    select cid, max(sc) as sc
    from (
      select unnest(pairs) as cid, unnest(scores) as sc
    ) u
    group by cid
  ),
  topn as (
    select cid, sc from deduped order by sc desc, cid limit lim
  )
  select
    coalesce(array_agg(cid order by sc desc, cid), array[]::uuid[]),
    coalesce(array_agg(sc order by sc desc, cid), array[]::float8[])
  into pairs, scores
  from topn;

  if pairs is null then
    pairs := array[]::uuid[];
    scores := array[]::float8[];
  end if;

  insert into public.user_similarity_cache (user_id, similar_user_ids, similarity_scores, updated_at)
  values (p_user_id, pairs, scores, now())
  on conflict (user_id) do update set
    similar_user_ids = excluded.similar_user_ids,
    similarity_scores = excluded.similarity_scores,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_similarity(uuid) from public;
grant execute on function public.refresh_user_similarity(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC reads (batch for enrichment)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_similarity(p_user_id uuid)
returns table (
  user_id uuid,
  similar_user_ids uuid[],
  similarity_scores float8[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id, c.similar_user_ids, c.similarity_scores, c.updated_at
  from public.user_similarity_cache c
  where c.user_id = p_user_id;
$$;

revoke all on function public.get_user_similarity(uuid) from public;
grant execute on function public.get_user_similarity(uuid) to authenticated;

create or replace function public.get_users_similarity_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  similar_user_ids uuid[],
  similarity_scores float8[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid as user_id,
    c.similar_user_ids,
    c.similarity_scores,
    c.updated_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_similarity_cache c on c.user_id = u.uid;
$$;

revoke all on function public.get_users_similarity_batch(uuid[]) from public;
grant execute on function public.get_users_similarity_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers — refresh similarity when identity signals change (does not write persona cache)
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_similarity_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.user_id, old.user_id);
  if uid is null then
    return coalesce(new, old);
  end if;
  perform public.refresh_user_similarity(uid);
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_user_similarity_play on public.user_play_identity;
create trigger tr_user_similarity_play
  after insert or update on public.user_play_identity
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_fandom on public.user_fandom_identity;
create trigger tr_user_similarity_fandom
  after insert or update on public.user_fandom_identity
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_value on public.user_collection_value_cache;
create trigger tr_user_similarity_value
  after insert or update on public.user_collection_value_cache
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_mastery on public.user_collection_mastery;
create trigger tr_user_similarity_mastery
  after insert or update on public.user_collection_mastery
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_trade on public.user_trade_reputation;
create trigger tr_user_similarity_trade
  after insert or update on public.user_trade_reputation
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_journey on public.user_journey_progress;
create trigger tr_user_similarity_journey
  after insert or update on public.user_journey_progress
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_profile on public.social_public_profiles;
create trigger tr_user_similarity_profile
  after insert or update of tier_slug on public.social_public_profiles
  for each row execute function public.tr_user_similarity_refresh();

drop trigger if exists tr_user_similarity_grail on public.user_grail_cards;
create trigger tr_user_similarity_grail
  after insert or update or delete on public.user_grail_cards
  for each row execute function public.tr_user_similarity_refresh();

create or replace function public.tr_user_similarity_persona_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_similarity(new.user_id);
  return new;
end;
$$;

drop trigger if exists tr_user_similarity_persona on public.user_persona_cache;
create trigger tr_user_similarity_persona
  after insert or update on public.user_persona_cache
  for each row execute function public.tr_user_similarity_persona_cache();

create or replace function public.tr_user_similarity_seasonal_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.badge_type = 'seasonal_event' then
    perform public.refresh_user_similarity(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_user_similarity_seasonal on public.user_badges;
create trigger tr_user_similarity_seasonal
  after insert on public.user_badges
  for each row
  when (new.badge_type = 'seasonal_event')
  execute function public.tr_user_similarity_seasonal_badge();
