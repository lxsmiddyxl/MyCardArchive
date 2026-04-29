-- Collector influence graph: descriptive network reach dimensions (non-competitive).

create table if not exists public.user_influence_graph (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  identity_reach_score double precision not null default 0,
  contribution_reach_score double precision not null default 0,
  expertise_reach_score double precision not null default 0,
  social_reach_score double precision not null default 0,
  seasonal_reach_score double precision not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists user_influence_graph_updated_idx
  on public.user_influence_graph (updated_at desc);

alter table public.user_influence_graph enable row level security;
drop policy if exists "user_influence_graph_select_authenticated" on public.user_influence_graph;
create policy "user_influence_graph_select_authenticated"
  on public.user_influence_graph for select to authenticated using (true);
grant select on table public.user_influence_graph to authenticated;

create table if not exists public.user_influence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  weight double precision not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_influence_events_user_created_idx
  on public.user_influence_events (user_id, created_at desc);
create index if not exists user_influence_events_type_idx
  on public.user_influence_events (event_type);

alter table public.user_influence_events enable row level security;
revoke all on table public.user_influence_events from public;
revoke all on table public.user_influence_events from anon;
revoke all on table public.user_influence_events from authenticated;
grant insert, select on table public.user_influence_events to service_role;

create or replace function public.log_user_influence_event(
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
  insert into public.user_influence_events (user_id, event_type, weight, metadata)
  values (
    p_user_id,
    trim(p_event_type),
    coalesce(p_weight, 1.0),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_user_influence_event(uuid, text, double precision, jsonb) from public;

create or replace function public.refresh_user_influence(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts bigint;
  v_comments bigint;
  v_scans bigint;
  v_deck_cards bigint;
  v_mastery bigint;
  v_high_rarity bigint;
  v_fandom_breadth int;
  v_persona_terms int;
  v_club_count int;
  v_mutuals bigint;
  v_similarity_count int;
  v_seasonal bigint;
  v_streak int;
  v_yir_viewed boolean;
  v_identity float;
  v_contrib float;
  v_expert float;
  v_social float;
  v_season float;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::bigint into v_posts from public.community_posts where author_id = p_user_id;
  select count(*)::bigint into v_comments from public.community_post_comments where author_id = p_user_id;
  select count(*)::bigint into v_scans from public.scan_events where user_id = p_user_id;
  select count(*)::bigint into v_deck_cards
  from public.deck_cards dc
  inner join public.decks d on d.id = dc.deck_id
  where d.user_id = p_user_id;

  select count(*)::bigint into v_mastery
  from public.user_collection_mastery m
  where m.user_id = p_user_id and m.is_complete;

  select coalesce((
    select c.high_rarity_count::bigint from public.user_collection_value_cache c where c.user_id = p_user_id limit 1
  ), 0::bigint) into v_high_rarity;

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
  ), 0) into v_fandom_breadth;

  select coalesce((
    select cardinality(tsvector_to_array(i.persona_tokens))
    from public.user_search_index i
    where i.user_id = p_user_id
    limit 1
  ), 0) into v_persona_terms;

  select count(*)::int into v_club_count from public.user_clubs uc where uc.user_id = p_user_id;

  select count(*)::bigint into v_mutuals
  from public.social_mutual_pairs sm
  where sm.user_low = p_user_id or sm.user_high = p_user_id;

  select coalesce((
    select cardinality(coalesce(s.similar_user_ids, array[]::uuid[]))
    from public.user_similarity_cache s
    where s.user_id = p_user_id
    limit 1
  ), 0) into v_similarity_count;

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation se
  where se.user_id = p_user_id;

  select coalesce((
    select st.streak_count from public.user_activity_streaks st where st.user_id = p_user_id limit 1
  ), 0) into v_streak;

  select exists (
    select 1
    from public.user_year_in_review y
    where y.user_id = p_user_id and y.viewed_at is not null
  ) into v_yir_viewed;

  v_identity := least(
    100::double precision,
    sqrt(greatest(v_persona_terms, 0)::double precision) * 10.0
      + greatest(v_club_count, 0)::double precision * 13.0
      + greatest(v_fandom_breadth, 0)::double precision * 8.0
  );

  v_contrib := least(
    100::double precision,
    sqrt(greatest(v_posts, 0)::double precision) * 8.0
      + sqrt(greatest(v_comments, 0)::double precision) * 6.0
      + sqrt(greatest(v_scans, 0)::double precision) * 4.5
      + sqrt(greatest(v_deck_cards, 0)::double precision) * 1.2
  );

  v_expert := least(
    100::double precision,
    greatest(v_mastery, 0)::double precision * 13.0
      + sqrt(greatest(v_deck_cards, 0)::double precision) * 2.0
      + sqrt(greatest(v_high_rarity, 0)::double precision) * 3.0
      + greatest(v_fandom_breadth, 0)::double precision * 5.0
  );

  v_social := least(
    100::double precision,
    sqrt(greatest(v_mutuals, 0)::double precision) * 10.0
      + sqrt(greatest(v_similarity_count, 0)::double precision) * 10.0
      + greatest(v_club_count, 0)::double precision * 6.0
  );

  v_season := least(
    100::double precision,
    greatest(v_seasonal, 0)::double precision * 14.0
      + greatest(v_streak, 0)::double precision * 3.2
      + case when v_yir_viewed then 18::double precision else 0::double precision end
  );

  insert into public.user_influence_graph (
    user_id,
    identity_reach_score,
    contribution_reach_score,
    expertise_reach_score,
    social_reach_score,
    seasonal_reach_score,
    updated_at
  )
  values (
    p_user_id,
    v_identity,
    v_contrib,
    v_expert,
    v_social,
    v_season,
    now()
  )
  on conflict (user_id) do update set
    identity_reach_score = excluded.identity_reach_score,
    contribution_reach_score = excluded.contribution_reach_score,
    expertise_reach_score = excluded.expertise_reach_score,
    social_reach_score = excluded.social_reach_score,
    seasonal_reach_score = excluded.seasonal_reach_score,
    updated_at = excluded.updated_at;

  if v_identity >= 55 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'influence', 'identity_influencer', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if v_contrib >= 55 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'influence', 'community_influencer', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if v_expert >= 55 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'influence', 'expert_influencer', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if v_season >= 45 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'influence', 'seasonal_influencer', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if v_identity >= 45 and v_contrib >= 45 and v_expert >= 45 and v_social >= 45 and v_season >= 40 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'influence', 'collector_influencer', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_influence(uuid) from public;

create or replace function public.get_user_influence(p_user_id uuid)
returns table (
  identity_reach_score double precision,
  contribution_reach_score double precision,
  expertise_reach_score double precision,
  social_reach_score double precision,
  seasonal_reach_score double precision,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_influence_graph g where g.user_id = p_user_id) then
    perform public.refresh_user_influence(p_user_id);
  end if;
  return query
  select
    coalesce(g.identity_reach_score, 0),
    coalesce(g.contribution_reach_score, 0),
    coalesce(g.expertise_reach_score, 0),
    coalesce(g.social_reach_score, 0),
    coalesce(g.seasonal_reach_score, 0),
    coalesce(g.updated_at, now())
  from public.user_influence_graph g
  where g.user_id = p_user_id;
end;
$$;

revoke all on function public.get_user_influence(uuid) from public;
grant execute on function public.get_user_influence(uuid) to authenticated;

create or replace function public.get_users_influence_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  identity_reach_score double precision,
  contribution_reach_score double precision,
  expertise_reach_score double precision,
  social_reach_score double precision,
  seasonal_reach_score double precision,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    coalesce(g.identity_reach_score, 0::double precision),
    coalesce(g.contribution_reach_score, 0::double precision),
    coalesce(g.expertise_reach_score, 0::double precision),
    coalesce(g.social_reach_score, 0::double precision),
    coalesce(g.seasonal_reach_score, 0::double precision),
    coalesce(g.updated_at, to_timestamp(0))
  from unnest(p_user_ids) as u(uid)
  left join public.user_influence_graph g on g.user_id = u.uid;
$$;

revoke all on function public.get_users_influence_batch(uuid[]) from public;
grant execute on function public.get_users_influence_batch(uuid[]) to authenticated;

create or replace function public.get_influence_spotlights(p_dimension text, p_limit int)
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
      when 'identity_reach' then 'Spotlight: identity resonates across clubs and collector surfaces.'
      when 'contribution_reach' then 'Spotlight: consistent community contribution.'
      when 'expertise_reach' then 'Spotlight: trusted expertise across decks and sets.'
      when 'social_reach' then 'Spotlight: connective presence among aligned collectors.'
      when 'seasonal_reach' then 'Spotlight: recurring seasonal momentum.'
      else 'Spotlight: multi-dimensional collector influence.'
    end::text
  from public.user_influence_graph g
  where case v_dim
    when 'identity_reach' then g.identity_reach_score >= 58
    when 'contribution_reach' then g.contribution_reach_score >= 58
    when 'expertise_reach' then g.expertise_reach_score >= 58
    when 'social_reach' then g.social_reach_score >= 58
    when 'seasonal_reach' then g.seasonal_reach_score >= 58
    else greatest(
      g.identity_reach_score,
      g.contribution_reach_score,
      g.expertise_reach_score,
      g.social_reach_score,
      g.seasonal_reach_score
    ) >= 58
  end
  order by random()
  limit v_lim;
end;
$$;

revoke all on function public.get_influence_spotlights(text, int) from public;
grant execute on function public.get_influence_spotlights(text, int) to authenticated;

create or replace function public.get_user_influence_events_public(p_user_id uuid, p_limit int)
returns table (
  label text,
  occurred_on date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case e.event_type
      when 'community_post' then 'Published a community post'
      when 'community_comment' then 'Added to a community discussion'
      when 'seasonal_participation' then 'Joined a seasonal event'
      when 'yir_viewed' then 'Opened Year in Review'
      when 'similarity_refresh' then 'Similarity graph refreshed'
      when 'clubs_refresh' then 'Club assignment changed'
      when 'reputation_refresh' then 'Reputation graph evolved'
      when 'search_refresh' then 'Discovery profile refreshed'
      else 'Influence signal updated'
    end as label,
    (timezone('utc', e.created_at))::date as occurred_on
  from public.user_influence_events e
  where e.user_id = p_user_id
  order by e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 16), 40));
$$;

revoke all on function public.get_user_influence_events_public(uuid, int) from public;
grant execute on function public.get_user_influence_events_public(uuid, int) to authenticated;

create or replace function public.trg_influence_event_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_influence(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_influence_event_refresh on public.user_influence_events;
create trigger tr_influence_event_refresh
  after insert on public.user_influence_events
  for each row execute function public.trg_influence_event_refresh();

create or replace function public.trg_influence_log_and_refresh_simple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
  ev text := tg_argv[0];
  w double precision := coalesce(nullif(tg_argv[1], '')::double precision, 1.0);
begin
  if uid is not null then
    perform public.log_user_influence_event(uid, ev, w, '{}'::jsonb);
    perform public.refresh_user_influence(uid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_influence_from_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null then
    perform public.log_user_influence_event(new.author_id, 'community_post', 1.0, '{}'::jsonb);
    perform public.refresh_user_influence(new.author_id);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_influence_from_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null then
    perform public.log_user_influence_event(new.author_id, 'community_comment', 0.7, '{}'::jsonb);
    perform public.refresh_user_influence(new.author_id);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_influence_from_similarity_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_influence_event(new.user_id, 'similarity_refresh', 0.25, '{}'::jsonb);
    perform public.refresh_user_influence(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_influence_posts_ai on public.community_posts;
create trigger tr_influence_posts_ai
  after insert on public.community_posts
  for each row execute function public.trg_influence_from_post_author();

drop trigger if exists tr_influence_comments_ai on public.community_post_comments;
create trigger tr_influence_comments_ai
  after insert on public.community_post_comments
  for each row execute function public.trg_influence_from_comment_author();

drop trigger if exists tr_influence_seasonal_ai on public.seasonal_event_participation;
create trigger tr_influence_seasonal_ai
  after insert on public.seasonal_event_participation
  for each row execute function public.trg_influence_log_and_refresh_simple('seasonal_participation', '0.9');

drop trigger if exists tr_influence_yir_au on public.user_year_in_review;
create trigger tr_influence_yir_au
  after update of viewed_at on public.user_year_in_review
  for each row
  when (new.viewed_at is not null and old.viewed_at is distinct from new.viewed_at)
  execute function public.trg_influence_log_and_refresh_simple('yir_viewed', '0.8');

drop trigger if exists tr_influence_similarity_au on public.user_similarity_cache;
create trigger tr_influence_similarity_au
  after insert or update on public.user_similarity_cache
  for each row execute function public.trg_influence_from_similarity_cache();

drop trigger if exists tr_influence_clubs_aiud on public.user_clubs;
create trigger tr_influence_clubs_aiud
  after insert or update or delete on public.user_clubs
  for each row execute function public.trg_influence_log_and_refresh_simple('clubs_refresh', '0.5');

drop trigger if exists tr_influence_reputation_au on public.user_reputation_graph;
create trigger tr_influence_reputation_au
  after insert or update on public.user_reputation_graph
  for each row execute function public.trg_influence_log_and_refresh_simple('reputation_refresh', '0.35');

drop trigger if exists tr_influence_search_au on public.user_search_index;
create trigger tr_influence_search_au
  after insert or update on public.user_search_index
  for each row execute function public.trg_influence_log_and_refresh_simple('search_refresh', '0.3');

drop trigger if exists tr_influence_persona_au on public.user_persona_cache;
create trigger tr_influence_persona_au
  after insert or update on public.user_persona_cache
  for each row execute function public.trg_influence_log_and_refresh_simple('persona_refresh', '0.4');

drop trigger if exists tr_influence_season_summary_ai on public.user_season_summaries;
create trigger tr_influence_season_summary_ai
  after insert on public.user_season_summaries
  for each row execute function public.trg_influence_log_and_refresh_simple('season_summary', '0.4');

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
      when 'influence' then 6
      when 'collection_mastery' then 7
      when 'trade_reputation' then 8
      when 'play_identity' then 9
      when 'collection_value' then 10
      when 'fandom' then 11
      else 13
    end,
    case b.badge_type
      when 'influence' then
        case b.badge_key
          when 'collector_influencer' then 5
          when 'expert_influencer' then 4
          when 'community_influencer' then 3
          when 'identity_influencer' then 2
          when 'seasonal_influencer' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
