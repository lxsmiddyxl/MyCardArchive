-- Phase MCA Social: Graph v4 (unified qualitative cache), Feed v3 (identity + presence + cluster signals),
-- Interactions v2 (feed saves, social nods, expanded post reactions). No raw taste vectors on wire.

-- ---------------------------------------------------------------------------
-- user_social_graph_v4 — qualitative fusion cache (refreshed via RPC only)
-- ---------------------------------------------------------------------------

create table if not exists public.user_social_graph_v4 (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  narrative jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_social_graph_v4 is
  'Social Graph v4: fused qualitative echoes (social + taste + identity + waves + rooms) — no numeric scores in narrative.';

create index if not exists user_social_graph_v4_updated_idx
  on public.user_social_graph_v4 (updated_at desc);

alter table public.user_social_graph_v4 enable row level security;

drop policy if exists "user_social_graph_v4_select_authenticated" on public.user_social_graph_v4;
create policy "user_social_graph_v4_select_authenticated"
  on public.user_social_graph_v4 for select to authenticated using (true);

revoke insert, update, delete on public.user_social_graph_v4 from authenticated;
grant select on public.user_social_graph_v4 to authenticated;
grant all on public.user_social_graph_v4 to service_role;

-- ---------------------------------------------------------------------------
-- Stale check
-- ---------------------------------------------------------------------------

create or replace function public._social_graph_v4_stale(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select g.updated_at is null
        or g.updated_at < (now() - interval '36 hours')
      from public.user_social_graph_v4 g
      where g.user_id = p_user_id
    ),
    true
  );
$$;

revoke all on function public._social_graph_v4_stale(uuid) from public;

-- ---------------------------------------------------------------------------
-- refresh_user_social_graph_v4
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_social_graph_v4(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mutual bigint;
  v_social_echo text;
  v_taste_echo text;
  v_identity_bridge text;
  v_ambient text;
  v_wave text;
  v_room_line text;
  v_head text;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::bigint into v_mutual
  from public.social_mutual_pairs smp
  where smp.user_low = p_user_id or smp.user_high = p_user_id;

  v_social_echo := case
    when coalesce(v_mutual, 0) >= 12 then 'Wide mutual circle — you trade in a well-connected hobby pocket.'
    when coalesce(v_mutual, 0) >= 4 then 'Healthy mutual graph — familiar faces show up often.'
    when coalesce(v_mutual, 0) >= 1 then 'Mutual follows are forming — social glue is warming up.'
    else 'Social graph is still light — discovery-first collecting season.'
  end;

  select c.label into v_taste_echo
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
    ua.updated_at desc
  limit 1;

  if v_taste_echo is null then
    v_taste_echo := 'Taste archetypes are still settling — keep scanning and curating.';
  else
    v_taste_echo := 'Primary collector tone: ' || v_taste_echo || '.';
  end if;

  select left(coalesce(m.identity->>'identityHeadline', ''), 160) into v_identity_bridge
  from public.user_identity_map m
  where m.user_id = p_user_id;

  if v_identity_bridge is null or length(trim(v_identity_bridge)) = 0 then
    v_identity_bridge := 'Identity map will sharpen as your public collecting story grows.';
  else
    v_identity_bridge := 'Identity echo: ' || v_identity_bridge || '.';
  end if;

  v_wave := public._identity_platform_wave_phrase((
    select c.wave_band
    from public.collector_activity_wave c
    where c.day_bucket = extract(isodow from timezone('utc', now()))::smallint
      and c.hour_bucket = extract(hour from timezone('utc', now()))::smallint
    limit 1
  ));

  if v_wave is null then
    v_wave := 'Platform rhythm is steady — good time to browse and trade.';
  end if;

  if exists (
    select 1
    from public.collector_room_members crm
    inner join public.collector_rooms cr on cr.room_id = crm.room_id
    where crm.user_id = p_user_id
      and cr.expires_at > now()
      and crm.last_seen_at > now() - interval '14 days'
  ) then
    v_room_line := 'Collector rooms show up in your recent cadence — ambient co-presence without chat noise.';
  else
    v_room_line := 'Rooms are quiet lately — you can drift into a set or live feed room anytime.';
  end if;

  v_ambient := v_wave || ' ' || v_room_line;

  v_head := coalesce(v_social_echo, '') || ' ' || coalesce(v_taste_echo, '');

  insert into public.user_social_graph_v4 (user_id, narrative, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'socialEcho', v_social_echo,
      'tasteEcho', v_taste_echo,
      'identityBridge', v_identity_bridge,
      'ambientEcho', v_ambient,
      'headline', left(v_head, 280)
    ),
    now()
  )
  on conflict (user_id) do update set
    narrative = excluded.narrative,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_social_graph_v4(uuid) from public;
grant execute on function public.refresh_user_social_graph_v4(uuid) to service_role;

-- Authenticated users may refresh their own snapshot only.
create or replace function public.refresh_my_social_graph_v4()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  perform public.refresh_user_social_graph_v4(auth.uid());
end;
$$;

revoke all on function public.refresh_my_social_graph_v4() from public;
grant execute on function public.refresh_my_social_graph_v4() to authenticated;

-- ---------------------------------------------------------------------------
-- get_users_social_graph_v4_batch
-- ---------------------------------------------------------------------------

create or replace function public.get_users_social_graph_v4_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  narrative jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if p_user_ids is null then
    return;
  end if;

  foreach v_uid in array p_user_ids
  loop
    if v_uid is not null and public._social_graph_v4_stale(v_uid) then
      perform public.refresh_user_social_graph_v4(v_uid);
    end if;
  end loop;

  return query
  select g.user_id, g.narrative, g.updated_at
  from public.user_social_graph_v4 g
  where g.user_id = any (p_user_ids);
end;
$$;

comment on function public.get_users_social_graph_v4_batch(uuid[]) is
  'Social Graph v4 batch read — refreshes stale rows server-side; returns qualitative narrative JSON only.';

revoke all on function public.get_users_social_graph_v4_batch(uuid[]) from public;
grant execute on function public.get_users_social_graph_v4_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- get_global_feed_v3 — v2 signals + identity_alignment + presence_proximity + cluster_fusion
-- ---------------------------------------------------------------------------

create or replace function public.get_global_feed_v3(p_limit integer default 24, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  lim integer := greatest(1, least(coalesce(p_limit, 24), 50));
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(t))
      from (
        select
          fe.id,
          fe.kind,
          fe.actor_id,
          fe.subject_id,
          fe.payload,
          fe.created_at,
          rs.rank_score,
          rs.signals
        from public.feed_events fe
        cross join lateral (
          select
            (extract(epoch from fe.created_at)) as recency_epoch,
            (case
              when exists (
                select 1 from public.social_mutual_pairs smp
                where (smp.user_low = uid and smp.user_high = fe.actor_id)
                   or (smp.user_high = uid and smp.user_low = fe.actor_id)
              ) then 86400.0
              else 0.0
            end) as mutual_boost,
            (case
              when fe.kind = 'post' and fe.subject_id is not null then
                least(
                  coalesce(
                    (select count(*)::numeric from public.community_post_likes l where l.post_id = fe.subject_id),
                    0
                  ),
                  48
                ) * 130.0
              else 0.0
            end) as engagement_boost,
            (least(
              coalesce(
                (
                  select count(distinct cc1.set_id)::numeric
                  from public.cards c1
                  inner join public.catalog_cards cc1 on cc1.id = c1.catalog_card_id
                  inner join public.cards c2 on c2.user_id = fe.actor_id and c2.catalog_card_id is not null
                  inner join public.catalog_cards cc2 on cc2.id = c2.catalog_card_id and cc2.set_id = cc1.set_id
                  where c1.user_id = uid and c1.catalog_card_id is not null
                ),
                0
              ),
              14
            ) * 55.0) as shared_sets_boost,
            (least(
              coalesce(
                (
                  select count(*)::numeric
                  from public.cards c1
                  inner join public.cards c2
                    on c2.user_id = fe.actor_id
                   and c1.catalog_card_id = c2.catalog_card_id
                   and c1.catalog_card_id is not null
                  where c1.user_id = uid
                    and (
                      (c1.for_trade = true or c1.looking_for = true)
                      and (c2.for_trade = true or c2.looking_for = true)
                    )
                ),
                0
              ),
              24
            ) * 42.0) as market_overlap_boost,
            ((mod(abs(hashtext(fe.id::text)), 1000))::numeric / 9000.0) as ml_placeholder,
            coalesce((
              with traits_viewer as (
                select jsonb_array_elements_text(
                  coalesce(im1.identity->'identityTraits', '[]'::jsonb)
                ) as trait
                from public.user_identity_map im1
                where im1.user_id = uid
              ),
              traits_actor as (
                select jsonb_array_elements_text(
                  coalesce(im2.identity->'identityTraits', '[]'::jsonb)
                ) as trait
                from public.user_identity_map im2
                where im2.user_id = fe.actor_id
              )
              select least(count(*)::numeric, 4) * 180.0
              from traits_viewer tv
              inner join traits_actor ta on tv.trait = ta.trait
            ), 0) as identity_alignment_boost,
            (case
              when exists (
                select 1
                from public.user_presence up
                where up.user_id = fe.actor_id
                  and coalesce(up.presence_opt_out, false) = false
                  and up.last_seen_at > now() - interval '30 minutes'
              ) then 6200.0
              else 0.0
            end) as presence_proximity_boost,
            coalesce((
              select least(count(*)::numeric, 4) * 440.0
              from public.user_archetypes ua1
              inner join public.user_archetypes ua2
                on ua2.user_id = fe.actor_id
               and ua2.archetype_id = ua1.archetype_id
              where ua1.user_id = uid
            ), 0) as cluster_fusion_boost
        ) raw
        cross join lateral (
          select
            (
              raw.recency_epoch
              + raw.mutual_boost
              + raw.engagement_boost
              + raw.shared_sets_boost
              + raw.market_overlap_boost
              + raw.ml_placeholder
              + raw.identity_alignment_boost
              + raw.presence_proximity_boost
              + raw.cluster_fusion_boost
            ) as rank_score,
            jsonb_build_object(
              'recency_epoch', raw.recency_epoch,
              'mutual', raw.mutual_boost,
              'engagement', raw.engagement_boost,
              'shared_sets', raw.shared_sets_boost,
              'marketplace_overlap', raw.market_overlap_boost,
              'ml_assist', raw.ml_placeholder,
              'identity_alignment', raw.identity_alignment_boost,
              'presence_proximity', raw.presence_proximity_boost,
              'cluster_fusion', raw.cluster_fusion_boost
            ) as signals
        ) rs
        where p_before is null or fe.created_at < p_before
        order by rs.rank_score desc, fe.created_at desc
        limit lim
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.get_global_feed_v3(integer, timestamptz) is
  'Social Feed v3: v2 ranking plus identity trait overlap, recent presence proximity, and archetype cluster fusion.';

revoke all on function public.get_global_feed_v3(integer, timestamptz) from public;
grant execute on function public.get_global_feed_v3(integer, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Interactions v2 — feed saves
-- ---------------------------------------------------------------------------

create table if not exists public.feed_event_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  feed_event_id uuid not null references public.feed_events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feed_event_id)
);

create index if not exists feed_event_saves_event_idx on public.feed_event_saves (feed_event_id);

comment on table public.feed_event_saves is
  'Lightweight bookmark of a feed row — no chat/DM.';

alter table public.feed_event_saves enable row level security;

drop policy if exists "feed_event_saves_select_own" on public.feed_event_saves;
create policy "feed_event_saves_select_own"
  on public.feed_event_saves for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "feed_event_saves_insert_own" on public.feed_event_saves;
create policy "feed_event_saves_insert_own"
  on public.feed_event_saves for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "feed_event_saves_delete_own" on public.feed_event_saves;
create policy "feed_event_saves_delete_own"
  on public.feed_event_saves for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.feed_event_saves to authenticated;

-- ---------------------------------------------------------------------------
-- social_nods — non-DM lightweight acknowledgement (rate-limited in RPC)
-- ---------------------------------------------------------------------------

create table if not exists public.social_nods (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint social_nods_no_self check (from_user_id <> to_user_id)
);

create index if not exists social_nods_to_created_idx on public.social_nods (to_user_id, created_at desc);
create index if not exists social_nods_from_created_idx on public.social_nods (from_user_id, created_at desc);

comment on table public.social_nods is
  'Ephemeral-style acknowledgement between trainers — counts not shown publicly; capped per RPC.';

alter table public.social_nods enable row level security;

drop policy if exists "social_nods_select_participant" on public.social_nods;
create policy "social_nods_select_participant"
  on public.social_nods for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "social_nods_insert_own" on public.social_nods;
create policy "social_nods_insert_own"
  on public.social_nods for insert to authenticated
  with check (auth.uid() = from_user_id);

grant select, insert on public.social_nods to authenticated;

create or replace function public.post_social_nod(p_to_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := auth.uid();
  v_day_count int;
begin
  if v_from is null then
    raise exception 'not authenticated';
  end if;
  if p_to_user_id is null or p_to_user_id = v_from then
    return jsonb_build_object('ok', false, 'reason', 'invalid_target');
  end if;

  select count(*)::int into v_day_count
  from public.social_nods n
  where n.from_user_id = v_from
    and n.to_user_id = p_to_user_id
    and n.created_at > now() - interval '1 day';

  if coalesce(v_day_count, 0) >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'daily_cap');
  end if;

  insert into public.social_nods (from_user_id, to_user_id) values (v_from, p_to_user_id);
  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.post_social_nod(uuid) is
  'Social Interactions v2: capped nods per trainer pair per UTC day.';

revoke all on function public.post_social_nod(uuid) from public;
grant execute on function public.post_social_nod(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reactions v2 — expand allowed emoji set (collector-forward)
-- ---------------------------------------------------------------------------

alter table public.community_post_reactions drop constraint if exists community_post_reactions_emoji;

alter table public.community_post_reactions
  add constraint community_post_reactions_emoji check (
    reaction in ('👍', '❤️', '🔥', '😂', '🎉', '🎴', '⚡', '✨')
  );

comment on constraint community_post_reactions_emoji on public.community_post_reactions is
  'Phase social interactions v2: adds card nod, energy spark, and highlight sparkle reactions.';
