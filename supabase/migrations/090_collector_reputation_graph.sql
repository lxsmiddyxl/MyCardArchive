-- Collector reputation graph: multi-dimensional scores, event log, RPCs, triggers.
-- Extends legacy `user_reputation_cache.score` (still maintained for journey / Top Contributor flair).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_reputation_graph (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  helpfulness_score double precision not null default 0,
  expertise_score double precision not null default 0,
  positivity_score double precision not null default 0,
  reliability_score double precision not null default 0,
  contribution_score double precision not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.user_reputation_graph is
  'Normalized 0–100 reputation dimensions (server-only; UI uses qualitative summaries).';

create index if not exists user_reputation_graph_updated_idx
  on public.user_reputation_graph (updated_at desc);

alter table public.user_reputation_graph enable row level security;

drop policy if exists "user_reputation_graph_select_authenticated" on public.user_reputation_graph;
create policy "user_reputation_graph_select_authenticated"
  on public.user_reputation_graph for select to authenticated using (true);

grant select on table public.user_reputation_graph to authenticated;

create table if not exists public.user_reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  weight double precision not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.user_reputation_events is
  'Append-only reputation activity log; read only via sanitized RPC — no direct client dumps.';

create index if not exists user_reputation_events_user_created_idx
  on public.user_reputation_events (user_id, created_at desc);

create index if not exists user_reputation_events_type_idx
  on public.user_reputation_events (event_type);

alter table public.user_reputation_events enable row level security;

revoke all on table public.user_reputation_events from public;
revoke all on table public.user_reputation_events from anon;
revoke all on table public.user_reputation_events from authenticated;

grant insert, select on table public.user_reputation_events to service_role;

-- ---------------------------------------------------------------------------
-- log_user_reputation_event (internal + trusted triggers only)
-- ---------------------------------------------------------------------------

create or replace function public.log_user_reputation_event(
  p_user_id uuid,
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
  insert into public.user_reputation_events (user_id, event_type, weight, metadata)
  values (
    p_user_id,
    trim(p_event_type),
    coalesce(p_weight, 1.0),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_user_reputation_event(uuid, text, double precision, jsonb) from public;
-- Intentionally no grant to authenticated — only SECURITY DEFINER triggers / refresh chain.

-- ---------------------------------------------------------------------------
-- refresh_user_reputation: legacy cache + five dimensions (0–100) + reputation badges
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_reputation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts bigint;
  v_comments bigint;
  v_likes_received bigint;
  v_scans bigint;
  v_score bigint;
  v_dc bigint;
  v_bs bigint;
  v_mcomp bigint;
  v_jcomp bigint;
  v_seasonal bigint;
  v_streak int;
  v_hi bigint;
  v_fan_pins int;
  v_play_pins int;
  v_seen_recent boolean;
  v_help float;
  v_exp float;
  v_pos float;
  v_rel float;
  v_cont float;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::bigint into v_posts
  from public.community_posts
  where author_id = p_user_id;

  select count(*)::bigint into v_comments
  from public.community_post_comments
  where author_id = p_user_id;

  select count(*)::bigint into v_likes_received
  from public.community_post_likes l
  inner join public.community_posts p on p.id = l.post_id
  where p.author_id = p_user_id;

  select count(*)::bigint into v_scans
  from public.scan_events
  where user_id = p_user_id;

  v_score :=
    v_posts * 10
    + v_comments * 5
    + v_likes_received * 2
    + v_scans * 1;

  insert into public.user_reputation_cache (user_id, score, updated_at)
  values (p_user_id, v_score, now())
  on conflict (user_id) do update set
    score = excluded.score,
    updated_at = excluded.updated_at;

  select count(*)::bigint into v_dc
  from public.deck_cards dc
  inner join public.decks d on d.id = dc.deck_id
  where d.user_id = p_user_id;

  select count(*)::bigint into v_bs
  from public.binder_slots bs
  inner join public.binders b on b.id = bs.binder_id
  where b.user_id = p_user_id;

  select count(*)::bigint into v_mcomp
  from public.user_collection_mastery m
  where m.user_id = p_user_id and m.is_complete;

  select count(*)::bigint into v_jcomp
  from public.user_journey_progress j
  where j.user_id = p_user_id and j.is_complete;

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation s
  where s.user_id = p_user_id;

  select coalesce((
    select s.streak_count from public.user_activity_streaks s where s.user_id = p_user_id limit 1
  ), 0) into v_streak;

  select coalesce((
    select c.high_rarity_count::bigint from public.user_collection_value_cache c where c.user_id = p_user_id limit 1
  ), 0::bigint) into v_hi;

  select coalesce((
    select
      (case when f.favorite_set_id is not null and length(trim(f.favorite_set_id)) > 0 then 1 else 0 end)
      + (case when f.favorite_era_id is not null and length(trim(f.favorite_era_id)) > 0 then 1 else 0 end)
      + (case when f.favorite_artist_id is not null and length(trim(f.favorite_artist_id)) > 0 then 1 else 0 end)
      + (case when f.favorite_character_id is not null and length(trim(f.favorite_character_id)) > 0 then 1 else 0 end)
      + (case when f.favorite_theme_id is not null and length(trim(f.favorite_theme_id)) > 0 then 1 else 0 end)
    from public.user_fandom_identity f
    where f.user_id = p_user_id
    limit 1
  ), 0) into v_fan_pins;

  select coalesce((
    select
      (case when p.favorite_format_id is not null and length(trim(p.favorite_format_id)) > 0 then 1 else 0 end)
      + (case when p.favorite_archetype_id is not null and length(trim(p.favorite_archetype_id)) > 0 then 1 else 0 end)
    from public.user_play_identity p
    where p.user_id = p_user_id
    limit 1
  ), 0) into v_play_pins;

  select exists (
    select 1 from public.user_presence up
    where up.user_id = p_user_id
      and coalesce(up.presence_opt_out, false) = false
      and up.last_seen_at >= (now() - interval '7 days')
  ) into v_seen_recent;

  v_help := least(
    100::double precision,
    sqrt(greatest(v_comments, 0)::double precision) * 9.0
      + sqrt(greatest(v_posts, 0)::double precision) * 5.0
  );

  v_exp := least(
    100::double precision,
    sqrt(greatest(v_dc, 0)::double precision) * 3.2
      + greatest(v_mcomp, 0)::double precision * 14.0
      + greatest(v_jcomp, 0)::double precision * 11.0
      + least(36::double precision, sqrt(greatest(v_hi, 0)::double precision) * 2.4)
      + greatest(v_fan_pins, 0)::double precision * 5.5
      + greatest(v_play_pins, 0)::double precision * 6.0
  );

  v_pos := least(
    100::double precision,
    sqrt(greatest(v_likes_received, 0)::double precision) * 6.5
  );

  v_rel := least(
    100::double precision,
    greatest(v_streak, 0)::double precision * 3.8
      + least(40::double precision, greatest(v_seasonal, 0)::double precision * 9.0)
      + case when v_seen_recent then 14::double precision else 0::double precision end
  );

  v_cont := least(
    100::double precision,
    sqrt(greatest(v_posts, 0)::double precision) * 7.0
      + sqrt(greatest(v_scans, 0)::double precision) * 4.5
      + sqrt(greatest(v_dc, 0)::double precision) * 0.45
      + sqrt(greatest(v_bs, 0)::double precision) * 0.28
  );

  insert into public.user_reputation_graph (
    user_id,
    helpfulness_score,
    expertise_score,
    positivity_score,
    reliability_score,
    contribution_score,
    updated_at
  )
  values (
    p_user_id,
    v_help,
    v_exp,
    v_pos,
    v_rel,
    v_cont,
    now()
  )
  on conflict (user_id) do update set
    helpfulness_score = excluded.helpfulness_score,
    expertise_score = excluded.expertise_score,
    positivity_score = excluded.positivity_score,
    reliability_score = excluded.reliability_score,
    contribution_score = excluded.contribution_score,
    updated_at = excluded.updated_at;

  if v_help >= 50 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'reputation', 'helpful_collector', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;

  if v_exp >= 55 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'reputation', 'expert_collector', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;

  if v_pos >= 45 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'reputation', 'positive_contributor', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;

  if v_rel >= 45 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'reputation', 'reliable_collector', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;

  if v_help >= 42 and v_exp >= 42 and v_pos >= 40 and v_rel >= 40 and v_cont >= 50 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'reputation', 'community_pillar', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_reputation(uuid) from public;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_user_reputation(p_user_id uuid)
returns table (
  score bigint,
  updated_at timestamptz,
  helpfulness_score double precision,
  expertise_score double precision,
  positivity_score double precision,
  reliability_score double precision,
  contribution_score double precision,
  graph_updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_score bigint;
  v_upd timestamptz;
  v_g public.user_reputation_graph%rowtype;
begin
  select c.score, c.updated_at into v_score, v_upd
  from public.user_reputation_cache c
  where c.user_id = p_user_id;

  if not found then
    perform public.refresh_user_reputation(p_user_id);
    select c.score, c.updated_at into v_score, v_upd
    from public.user_reputation_cache c
    where c.user_id = p_user_id;
  end if;

  select * into v_g from public.user_reputation_graph g where g.user_id = p_user_id;
  if not found then
    perform public.refresh_user_reputation(p_user_id);
    select * into v_g from public.user_reputation_graph g where g.user_id = p_user_id;
  end if;

  score := coalesce(v_score, 0);
  updated_at := coalesce(v_upd, now());
  helpfulness_score := coalesce(v_g.helpfulness_score, 0);
  expertise_score := coalesce(v_g.expertise_score, 0);
  positivity_score := coalesce(v_g.positivity_score, 0);
  reliability_score := coalesce(v_g.reliability_score, 0);
  contribution_score := coalesce(v_g.contribution_score, 0);
  graph_updated_at := coalesce(v_g.updated_at, now());
  return next;
end;
$$;

revoke all on function public.get_user_reputation(uuid) from public;
grant execute on function public.get_user_reputation(uuid) to authenticated;

create or replace function public.get_users_reputation_graph_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  helpfulness_score double precision,
  expertise_score double precision,
  positivity_score double precision,
  reliability_score double precision,
  contribution_score double precision,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    coalesce(g.helpfulness_score, 0::double precision),
    coalesce(g.expertise_score, 0::double precision),
    coalesce(g.positivity_score, 0::double precision),
    coalesce(g.reliability_score, 0::double precision),
    coalesce(g.contribution_score, 0::double precision),
    coalesce(g.updated_at, to_timestamp(0))
  from unnest(p_user_ids) as u(uid)
  left join public.user_reputation_graph g on g.user_id = u.uid;
$$;

revoke all on function public.get_users_reputation_graph_batch(uuid[]) from public;
grant execute on function public.get_users_reputation_graph_batch(uuid[]) to authenticated;

create or replace function public.get_reputation_leaders(p_dimension text, p_limit int)
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
  v_dim text := lower(trim(coalesce(p_dimension, '')));
begin
  return query
  select
    g.user_id,
    case v_dim
      when 'helpfulness' then 'Spotlight: supportive answers in the community.'
      when 'expertise' then 'Spotlight: deep knowledge across decks and collections.'
      when 'positivity' then 'Spotlight: encouraging participation others notice.'
      when 'reliability' then 'Spotlight: steady presence and seasonal participation.'
      when 'contribution' then 'Spotlight: scans, binders, and posts that grow the archive.'
      else 'Spotlight: well-rounded collector energy.'
    end::text
  from public.user_reputation_graph g
  where case v_dim
    when 'helpfulness' then g.helpfulness_score >= 58
    when 'expertise' then g.expertise_score >= 58
    when 'positivity' then g.positivity_score >= 58
    when 'reliability' then g.reliability_score >= 58
    when 'contribution' then g.contribution_score >= 58
    else greatest(
      g.helpfulness_score,
      g.expertise_score,
      g.positivity_score,
      g.reliability_score,
      g.contribution_score
    ) >= 58
  end
  order by random()
  limit v_lim;
end;
$$;

revoke all on function public.get_reputation_leaders(text, int) from public;
grant execute on function public.get_reputation_leaders(text, int) to authenticated;

create or replace function public.get_user_reputation_events_public(p_user_id uuid, p_limit int)
returns table (
  label text,
  occurred_on date
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 40));
begin
  return query
  select
    case e.event_type
      when 'community_post' then 'Shared something with the community'
      when 'community_comment' then 'Joined a conversation constructively'
      when 'like_received' then 'Received appreciation on a post'
      when 'scan' then 'Cataloged cards with a scan'
      when 'deck_edit' then 'Refined a deck list'
      when 'binder_edit' then 'Updated a binder page'
      when 'seasonal_participation' then 'Joined a seasonal collector moment'
      when 'streak_progress' then 'Kept a healthy activity streak'
      when 'mastery_progress' then 'Made binder or set mastery progress'
      when 'identity_play' then 'Updated play preferences'
      when 'identity_fandom' then 'Refined public taste pins'
      else 'Contributed to the archive'
    end::text,
    (timezone('utc', e.created_at))::date
  from public.user_reputation_events e
  where e.user_id = p_user_id
  order by e.created_at desc
  limit v_lim;
end;
$$;

revoke all on function public.get_user_reputation_events_public(uuid, int) from public;
grant execute on function public.get_user_reputation_events_public(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: refresh existing community / scan paths + log (replace bodies)
-- ---------------------------------------------------------------------------

create or replace function public.trg_reputation_refresh_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  aid := coalesce(new.author_id, old.author_id);
  if aid is not null then
    if tg_op = 'INSERT' then
      perform public.log_user_reputation_event(aid, 'community_post', 1.0, '{}'::jsonb);
    end if;
    perform public.refresh_user_reputation(aid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  aid := coalesce(new.author_id, old.author_id);
  if aid is not null then
    if tg_op = 'INSERT' then
      perform public.log_user_reputation_event(aid, 'community_comment', 0.75, '{}'::jsonb);
    end if;
    perform public.refresh_user_reputation(aid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_like_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  author uuid;
begin
  pid := coalesce(new.post_id, old.post_id);
  if pid is null then
    return coalesce(new, old);
  end if;
  select p.author_id into author from public.community_posts p where p.id = pid limit 1;
  if author is not null then
    if tg_op = 'INSERT' then
      perform public.log_user_reputation_event(author, 'like_received', 0.35, '{}'::jsonb);
    end if;
    perform public.refresh_user_reputation(author);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_scan_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(new.user_id, 'scan', 0.5, '{}'::jsonb);
    perform public.refresh_user_reputation(new.user_id);
    perform public.touch_user_activity_streak(new.user_id);
  end if;
  return new;
end;
$$;

-- Deck / binder / seasonal / identity / mastery / streaks / journeys / value cache

create or replace function public.trg_rep_from_deck_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  did uuid;
  uid uuid;
begin
  did := coalesce(new.deck_id, old.deck_id);
  if did is null then
    return coalesce(new, old);
  end if;
  select d.user_id into uid from public.decks d where d.id = did limit 1;
  if uid is not null then
    if tg_op <> 'DELETE' then
      perform public.log_user_reputation_event(uid, 'deck_edit', 0.2, jsonb_build_object('surface', 'deck'));
    end if;
    perform public.refresh_user_reputation(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_rep_from_deck_cards() from public;

drop trigger if exists tr_rep_graph_deck_cards on public.deck_cards;
create trigger tr_rep_graph_deck_cards
  after insert or update or delete on public.deck_cards
  for each row execute function public.trg_rep_from_deck_cards();

create or replace function public.trg_rep_from_binder_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
  uid uuid;
begin
  bid := coalesce(new.binder_id, old.binder_id);
  if bid is null then
    return coalesce(new, old);
  end if;
  select b.user_id into uid from public.binders b where b.id = bid limit 1;
  if uid is not null then
    if tg_op <> 'DELETE' then
      perform public.log_user_reputation_event(uid, 'binder_edit', 0.15, jsonb_build_object('surface', 'binder'));
    end if;
    perform public.refresh_user_reputation(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_rep_from_binder_slots() from public;

drop trigger if exists tr_rep_graph_binder_slots on public.binder_slots;
create trigger tr_rep_graph_binder_slots
  after insert or update or delete on public.binder_slots
  for each row execute function public.trg_rep_from_binder_slots();

create or replace function public.trg_rep_from_seasonal_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(
      new.user_id,
      'seasonal_participation',
      1.0,
      jsonb_build_object('eventId', new.event_id)
    );
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_seasonal_participation() from public;

drop trigger if exists tr_rep_graph_seasonal on public.seasonal_event_participation;
create trigger tr_rep_graph_seasonal
  after insert on public.seasonal_event_participation
  for each row execute function public.trg_rep_from_seasonal_participation();

create or replace function public.trg_rep_from_activity_streaks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(new.user_id, 'streak_progress', 0.1, '{}'::jsonb);
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_activity_streaks() from public;

drop trigger if exists tr_rep_graph_streaks on public.user_activity_streaks;
create trigger tr_rep_graph_streaks
  after insert or update on public.user_activity_streaks
  for each row execute function public.trg_rep_from_activity_streaks();

create or replace function public.trg_rep_from_collection_mastery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(new.user_id, 'mastery_progress', 0.25, '{}'::jsonb);
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_collection_mastery() from public;

drop trigger if exists tr_rep_graph_mastery on public.user_collection_mastery;
create trigger tr_rep_graph_mastery
  after insert or update on public.user_collection_mastery
  for each row execute function public.trg_rep_from_collection_mastery();

create or replace function public.trg_rep_from_fandom_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(new.user_id, 'identity_fandom', 0.2, '{}'::jsonb);
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_fandom_identity() from public;

drop trigger if exists tr_rep_graph_fandom on public.user_fandom_identity;
create trigger tr_rep_graph_fandom
  after insert or update on public.user_fandom_identity
  for each row execute function public.trg_rep_from_fandom_identity();

create or replace function public.trg_rep_from_play_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_reputation_event(new.user_id, 'identity_play', 0.2, '{}'::jsonb);
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_play_identity() from public;

drop trigger if exists tr_rep_graph_play on public.user_play_identity;
create trigger tr_rep_graph_play
  after insert or update on public.user_play_identity
  for each row execute function public.trg_rep_from_play_identity();

create or replace function public.trg_rep_from_journey_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_journey_progress() from public;

drop trigger if exists tr_rep_graph_journey on public.user_journey_progress;
create trigger tr_rep_graph_journey
  after insert or update on public.user_journey_progress
  for each row execute function public.trg_rep_from_journey_progress();

create or replace function public.trg_rep_from_value_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rep_from_value_cache() from public;

drop trigger if exists tr_rep_graph_value_cache on public.user_collection_value_cache;
create trigger tr_rep_graph_value_cache
  after insert or update on public.user_collection_value_cache
  for each row execute function public.trg_rep_from_value_cache();

-- ---------------------------------------------------------------------------
-- get_user_badges: reputation tier after journey
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
      when 'reputation' then 5
      when 'collection_mastery' then 6
      when 'trade_reputation' then 7
      when 'play_identity' then 8
      when 'collection_value' then 9
      when 'fandom' then 10
      else 12
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
      when 'reputation' then
        case b.badge_key
          when 'community_pillar' then 5
          when 'expert_collector' then 4
          when 'helpful_collector' then 3
          when 'reliable_collector' then 2
          when 'positive_contributor' then 1
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
