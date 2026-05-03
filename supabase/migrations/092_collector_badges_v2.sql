-- Phase 24: Collector Badges 2.0 — dynamic progression (qualitative in UI, positive-only).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_badge_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_type text not null default 'collector_v2',
  badge_key text not null,
  tier text not null default 'bronze',
  qualitative_label text not null default 'Emerging',
  prestige_step int,
  prestige_steps_total int,
  season_label text,
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_type, badge_key)
);

comment on table public.user_badge_progress is
  'V2 badge tracks — tiers and labels are descriptive; no competitive ranking.';

create index if not exists user_badge_progress_user_idx
  on public.user_badge_progress (user_id, updated_at desc);

alter table public.user_badge_progress enable row level security;
drop policy if exists "user_badge_progress_select_authenticated" on public.user_badge_progress;
create policy "user_badge_progress_select_authenticated"
  on public.user_badge_progress for select to authenticated using (true);
grant select on table public.user_badge_progress to authenticated;

create table if not exists public.user_badge_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  badge_type text,
  badge_key text,
  weight double precision not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.user_badge_events is
  'Append-only internal progression log — not exposed publicly.';

create index if not exists user_badge_events_user_created_idx
  on public.user_badge_events (user_id, created_at desc);

alter table public.user_badge_events enable row level security;
revoke all on table public.user_badge_events from public;
revoke all on table public.user_badge_events from anon;
revoke all on table public.user_badge_events from authenticated;
grant insert, select on table public.user_badge_events to service_role;

-- ---------------------------------------------------------------------------
-- Helpers (internal tier scoring — never surfaced as raw numbers to clients)
-- ---------------------------------------------------------------------------

create or replace function public._badge_v2_tier_rank(t text)
returns int
language sql
immutable
as $$
  select case lower(coalesce(t, ''))
    when 'diamond' then 5
    when 'platinum' then 4
    when 'gold' then 3
    when 'silver' then 2
    when 'bronze' then 1
    else 0
  end;
$$;

create or replace function public._badge_v2_tier_from_count(c bigint)
returns text
language sql
immutable
as $$
  select case
    when c >= 5000 then 'diamond'
    when c >= 1000 then 'platinum'
    when c >= 500 then 'gold'
    when c >= 100 then 'silver'
    else 'bronze'
  end;
$$;

create or replace function public._badge_v2_label_from_tier(t text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(t, ''))
    when 'diamond' then 'Legendary cadence'
    when 'platinum' then 'Celebrated rhythm'
    when 'gold' then 'Recognized momentum'
    when 'silver' then 'Growing footprint'
    else 'Emerging journey'
  end;
$$;

-- ---------------------------------------------------------------------------
-- log_user_badge_event (service-oriented; security definer for controlled calls)
-- ---------------------------------------------------------------------------

create or replace function public.log_user_badge_event(
  p_user_id uuid,
  p_badge_id text,
  p_event_type text,
  p_weight double precision,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_event_type is null or length(trim(p_event_type)) = 0 then
    return;
  end if;
  insert into public.user_badge_events (user_id, event_type, badge_key, weight, metadata)
  values (
    p_user_id,
    trim(p_event_type),
    nullif(trim(coalesce(p_badge_id, '')), ''),
    coalesce(p_weight, 1.0),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_user_badge_event(uuid, text, text, double precision, jsonb) from public;
grant execute on function public.log_user_badge_event(uuid, text, text, double precision, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_badges
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scans bigint;
  v_posts bigint;
  v_comments bigint;
  v_likes_received bigint;
  v_community_score bigint;
  v_mastery bigint;
  v_seasonal bigint;
  v_clubs int;
  v_scan_tier text;
  v_comm_tier text;
  v_mastery_tier text;
  v_season_tier text;
  v_network_tier text;
  v_scan_label text;
  v_comm_label text;
  v_mastery_label text;
  v_season_label text;
  v_network_label text;
  v_season_display text;
  v_prestige_step int;
  v_silverish int;
  v_goldish int;
  v_high int;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::bigint into v_scans from public.scan_events where user_id = p_user_id;
  select count(*)::bigint into v_posts from public.community_posts where author_id = p_user_id;
  select count(*)::bigint into v_comments from public.community_post_comments where author_id = p_user_id;
  select count(*)::bigint into v_likes_received
  from public.community_post_likes l
  inner join public.community_posts p on p.id = l.post_id
  where p.author_id = p_user_id;

  v_community_score := v_posts * 4 + v_comments * 3 + v_likes_received * 2;

  select count(*)::bigint into v_mastery
  from public.user_collection_mastery m
  where m.user_id = p_user_id and m.is_complete;

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation se
  where se.user_id = p_user_id;

  select count(*)::int into v_clubs from public.user_clubs uc where uc.user_id = p_user_id;

  v_scan_tier := public._badge_v2_tier_from_count(v_scans);
  v_comm_tier := public._badge_v2_tier_from_count(greatest(v_community_score / 2, 0::bigint));
  v_mastery_tier := public._badge_v2_tier_from_count(v_mastery * 40::bigint);
  if v_seasonal >= 3 then
    v_season_tier := 'gold';
  elsif v_seasonal >= 1 then
    v_season_tier := 'silver';
  else
    v_season_tier := 'bronze';
  end if;

  if v_clubs >= 4 then
    v_network_tier := 'platinum';
  elsif v_clubs >= 2 then
    v_network_tier := 'gold';
  elsif v_clubs >= 1 then
    v_network_tier := 'silver';
  else
    v_network_tier := 'bronze';
  end if;

  v_scan_label := public._badge_v2_label_from_tier(v_scan_tier);
  v_comm_label := public._badge_v2_label_from_tier(v_comm_tier);
  v_mastery_label := public._badge_v2_label_from_tier(v_mastery_tier);
  v_season_label := public._badge_v2_label_from_tier(v_season_tier);
  v_network_label := public._badge_v2_label_from_tier(v_network_tier);

  if v_seasonal >= 1 then
    v_season_display := 'Seasonally active';
  else
    v_season_display := 'Seasonal explorer';
  end if;

  insert into public.user_badge_progress (
    user_id, badge_type, badge_key, tier, qualitative_label, prestige_step, prestige_steps_total, season_label, updated_at
  ) values
    (p_user_id, 'collector_v2', 'scan_momentum', v_scan_tier, v_scan_label, null, null, null, now()),
    (p_user_id, 'collector_v2', 'community_voice', v_comm_tier, v_comm_label, null, null, null, now()),
    (p_user_id, 'collector_v2', 'set_mastery_depth', v_mastery_tier, v_mastery_label, null, null, null, now()),
    (p_user_id, 'collector_v2', 'seasonal_presence', v_season_tier, v_season_label, null, null, v_season_display, now()),
    (p_user_id, 'collector_v2', 'club_network', v_network_tier, v_network_label, null, null, null, now())
  on conflict (user_id, badge_type, badge_key) do update set
    tier = excluded.tier,
    qualitative_label = excluded.qualitative_label,
    season_label = excluded.season_label,
    updated_at = excluded.updated_at;

  v_silverish := 0;
  v_goldish := 0;
  v_high := 0;
  if public._badge_v2_tier_rank(v_scan_tier) >= 2 then v_silverish := v_silverish + 1; end if;
  if public._badge_v2_tier_rank(v_comm_tier) >= 2 then v_silverish := v_silverish + 1; end if;
  if public._badge_v2_tier_rank(v_mastery_tier) >= 2 then v_silverish := v_silverish + 1; end if;
  if public._badge_v2_tier_rank(v_season_tier) >= 2 then v_silverish := v_silverish + 1; end if;
  if public._badge_v2_tier_rank(v_network_tier) >= 2 then v_silverish := v_silverish + 1; end if;

  if public._badge_v2_tier_rank(v_scan_tier) >= 3 then v_goldish := v_goldish + 1; end if;
  if public._badge_v2_tier_rank(v_comm_tier) >= 3 then v_goldish := v_goldish + 1; end if;
  if public._badge_v2_tier_rank(v_mastery_tier) >= 3 then v_goldish := v_goldish + 1; end if;
  if public._badge_v2_tier_rank(v_season_tier) >= 3 then v_goldish := v_goldish + 1; end if;
  if public._badge_v2_tier_rank(v_network_tier) >= 3 then v_goldish := v_goldish + 1; end if;

  if public._badge_v2_tier_rank(v_scan_tier) >= 4 then v_high := v_high + 1; end if;
  if public._badge_v2_tier_rank(v_comm_tier) >= 4 then v_high := v_high + 1; end if;
  if public._badge_v2_tier_rank(v_mastery_tier) >= 4 then v_high := v_high + 1; end if;

  v_prestige_step := 1;
  if v_silverish >= 3 then v_prestige_step := 2; end if;
  if v_goldish >= 4 and v_high >= 2 then v_prestige_step := 3; end if;

  insert into public.user_badge_progress (
    user_id, badge_type, badge_key, tier, qualitative_label, prestige_step, prestige_steps_total, season_label, updated_at
  ) values (
    p_user_id,
    'collector_v2',
    'prestige_collector_journey',
    case v_prestige_step when 3 then 'diamond' when 2 then 'gold' else 'silver' end,
    case v_prestige_step
      when 3 then 'Legacy chapter — collector icon'
      when 2 then 'Momentum chapter — rising recognition'
      else 'Foundation chapter — building signal'
    end,
    v_prestige_step,
    3,
    null,
    now()
  )
  on conflict (user_id, badge_type, badge_key) do update set
    tier = excluded.tier,
    qualitative_label = excluded.qualitative_label,
    prestige_step = excluded.prestige_step,
    prestige_steps_total = excluded.prestige_steps_total,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_badges(uuid) from public;

-- ---------------------------------------------------------------------------
-- RPCs (qualitative / structural — no raw scoring in UI)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_badge_progress(p_user_id uuid)
returns table (
  badge_type text,
  badge_key text,
  catalog_category text,
  tier text,
  qualitative_label text,
  season_label text,
  prestige_step int,
  prestige_steps_total int,
  display_hint text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_badges(p_user_id);
  return query
  select
    p.badge_type,
    p.badge_key,
    case p.badge_key
      when 'scan_momentum' then 'collection'
      when 'set_mastery_depth' then 'mastery'
      when 'community_voice' then 'social'
      when 'seasonal_presence' then 'seasonal'
      when 'club_network' then 'social'
      when 'prestige_collector_journey' then 'prestige'
      else 'collection'
    end::text,
    p.tier,
    p.qualitative_label,
    p.season_label,
    p.prestige_step,
    p.prestige_steps_total,
    case p.badge_key
      when 'scan_momentum' then 'Scan cadence across your archive'
      when 'community_voice' then 'Voice in posts, threads, and appreciation'
      when 'set_mastery_depth' then 'Depth across mastered sets and binders'
      when 'seasonal_presence' then 'Rhythm with seasonal collector moments'
      when 'club_network' then 'Cohort threads and club surfaces'
      when 'prestige_collector_journey' then 'Long arc prestige across multiple signals'
      else 'Collector progression'
    end::text
  from public.user_badge_progress p
  where p.user_id = p_user_id and p.badge_type = 'collector_v2'
  order by
    case p.badge_key
      when 'prestige_collector_journey' then 0
      when 'scan_momentum' then 1
      when 'community_voice' then 2
      when 'set_mastery_depth' then 3
      when 'seasonal_presence' then 4
      when 'club_network' then 5
      else 9
    end;
end;
$$;

revoke all on function public.get_user_badge_progress(uuid) from public;
grant execute on function public.get_user_badge_progress(uuid) to authenticated;

create or replace function public.get_users_badge_progress_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  badge_type text,
  badge_key text,
  catalog_category text,
  tier text,
  qualitative_label text,
  season_label text,
  prestige_step int,
  prestige_steps_total int,
  display_hint text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  foreach uid in array p_user_ids loop
    if uid is not null then
      perform public.refresh_user_badges(uid);
    end if;
  end loop;
  return query
  select
    p.user_id,
    p.badge_type,
    p.badge_key,
    case p.badge_key
      when 'scan_momentum' then 'collection'
      when 'set_mastery_depth' then 'mastery'
      when 'community_voice' then 'social'
      when 'seasonal_presence' then 'seasonal'
      when 'club_network' then 'social'
      when 'prestige_collector_journey' then 'prestige'
      else 'collection'
    end::text,
    p.tier,
    p.qualitative_label,
    p.season_label,
    p.prestige_step,
    p.prestige_steps_total,
    case p.badge_key
      when 'scan_momentum' then 'Scan cadence across your archive'
      when 'community_voice' then 'Voice in posts, threads, and appreciation'
      when 'set_mastery_depth' then 'Depth across mastered sets and binders'
      when 'seasonal_presence' then 'Rhythm with seasonal collector moments'
      when 'club_network' then 'Cohort threads and club surfaces'
      when 'prestige_collector_journey' then 'Long arc prestige across multiple signals'
      else 'Collector progression'
    end::text
  from public.user_badge_progress p
  where p.user_id = any(p_user_ids) and p.badge_type = 'collector_v2'
  order by
    p.user_id,
    case p.badge_key
      when 'prestige_collector_journey' then 0
      when 'scan_momentum' then 1
      when 'community_voice' then 2
      when 'set_mastery_depth' then 3
      when 'seasonal_presence' then 4
      when 'club_network' then 5
      else 9
    end;
end;
$$;

revoke all on function public.get_users_badge_progress_batch(uuid[]) from public;
grant execute on function public.get_users_badge_progress_batch(uuid[]) to authenticated;

create or replace function public.get_badge_spotlights(p_category text, p_limit int)
returns table (
  user_id uuid,
  spotlight_note text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 12), 24));
  v_cat text := lower(trim(coalesce(p_category, '')));
begin
  return query
  select
    p.user_id,
    case (floor(random() * 4))::int
      when 0 then 'Spotlight: a collector whose badges echo steady, positive cadence.'
      when 1 then 'Spotlight: seasonal rhythm meets thoughtful community presence.'
      when 2 then 'Spotlight: mastery-forward trainer with visible cohort ties.'
      else 'Spotlight: multi-track collector journey worth celebrating.'
    end::text
  from public.user_badge_progress p
  where p.badge_type = 'collector_v2'
    and public._badge_v2_tier_rank(p.tier) >= 3
    and (
      v_cat = ''
      or v_cat = 'all'
      or (v_cat = 'seasonal' and p.badge_key = 'seasonal_presence')
      or (v_cat = 'prestige' and p.badge_key = 'prestige_collector_journey')
      or (v_cat = 'mastery' and p.badge_key = 'set_mastery_depth')
      or (v_cat = 'social' and p.badge_key in ('community_voice', 'club_network'))
      or (v_cat = 'collection' and p.badge_key = 'scan_momentum')
    )
  order by random()
  limit v_lim;
end;
$$;

revoke all on function public.get_badge_spotlights(text, int) from public;
grant execute on function public.get_badge_spotlights(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers → refresh_user_badges (positive-only recomputation)
-- ---------------------------------------------------------------------------

create or replace function public.trg_refresh_badges_v2_uid()
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
    perform public.refresh_user_badges(uid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_refresh_badges_v2_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is not null then
    perform public.refresh_user_badges(new.author_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_refresh_badges_v2_like_pair()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  select p.author_id into aid from public.community_posts p where p.id = new.post_id;
  if aid is not null then
    perform public.refresh_user_badges(aid);
  end if;
  if new.user_id is not null then
    perform public.refresh_user_badges(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_refresh_badges_v2_rep_graph()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_badges(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_refresh_badges_v2_influence_graph()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_badges(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_badges_v2_scan_ai on public.scan_events;
create trigger tr_badges_v2_scan_ai
  after insert on public.scan_events
  for each row execute function public.trg_refresh_badges_v2_uid();

drop trigger if exists tr_badges_v2_posts_ai on public.community_posts;
create trigger tr_badges_v2_posts_ai
  after insert on public.community_posts
  for each row execute function public.trg_refresh_badges_v2_post_author();

drop trigger if exists tr_badges_v2_comments_ai on public.community_post_comments;
create trigger tr_badges_v2_comments_ai
  after insert on public.community_post_comments
  for each row execute function public.trg_refresh_badges_v2_post_author();

drop trigger if exists tr_badges_v2_likes_ai on public.community_post_likes;
create trigger tr_badges_v2_likes_ai
  after insert on public.community_post_likes
  for each row execute function public.trg_refresh_badges_v2_like_pair();

drop trigger if exists tr_badges_v2_rep_au on public.user_reputation_graph;
create trigger tr_badges_v2_rep_au
  after insert or update on public.user_reputation_graph
  for each row execute function public.trg_refresh_badges_v2_rep_graph();

drop trigger if exists tr_badges_v2_influence_au on public.user_influence_graph;
create trigger tr_badges_v2_influence_au
  after insert or update on public.user_influence_graph
  for each row execute function public.trg_refresh_badges_v2_influence_graph();

drop trigger if exists tr_badges_v2_mastery_aiu on public.user_collection_mastery;
create trigger tr_badges_v2_mastery_aiu
  after insert or update on public.user_collection_mastery
  for each row execute function public.trg_refresh_badges_v2_uid();

drop trigger if exists tr_badges_v2_seasonal_ai on public.seasonal_event_participation;
create trigger tr_badges_v2_seasonal_ai
  after insert on public.seasonal_event_participation
  for each row execute function public.trg_refresh_badges_v2_uid();

drop trigger if exists tr_badges_v2_clubs_aiud on public.user_clubs;
create trigger tr_badges_v2_clubs_aiud
  after insert or update or delete on public.user_clubs
  for each row execute function public.trg_refresh_badges_v2_uid();

notify pgrst, 'reload schema';
