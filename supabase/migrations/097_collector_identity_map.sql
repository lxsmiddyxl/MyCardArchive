-- Phase 29: Collector identity map — qualitative fusion layer (no public numeric scores, no raw taste vectors).

-- ---------------------------------------------------------------------------
-- Cache table
-- ---------------------------------------------------------------------------

create table if not exists public.user_identity_map (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  identity jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_identity_map is
  'Fused qualitative identity snapshot for profile + social; refreshed server-side only.';

alter table public.user_identity_map enable row level security;

drop policy if exists "user_identity_map_select_authenticated" on public.user_identity_map;
create policy "user_identity_map_select_authenticated"
  on public.user_identity_map for select to authenticated using (true);

grant select on table public.user_identity_map to authenticated;
revoke insert, update, delete on table public.user_identity_map from authenticated;
grant all on table public.user_identity_map to service_role;

-- ---------------------------------------------------------------------------
-- Wave band → qualitative copy (platform context, no user counts)
-- ---------------------------------------------------------------------------

create or replace function public._identity_platform_wave_phrase(p_band text)
returns text
language sql
immutable
parallel safe
as $$
  select case trim(lower(coalesce(p_band, '')))
    when 'very_active' then 'The hobby hub is buzzing right now — you are moving with a lively moment.'
    when 'active' then 'The wider community is in an active stretch — good energy to browse and trade.'
    when 'steady' then 'A steady hobby rhythm is in the air — calm, consistent collecting weather.'
    when 'quiet' then 'A quieter pocket on the clock — thoughtful, low-noise collecting time.'
    when 'sleeping' then 'A soft off-peak moment — restful cadence for the global collector map.'
    else null
  end;
$$;

revoke all on function public._identity_platform_wave_phrase(text) from public;

-- ---------------------------------------------------------------------------
-- refresh_user_identity_map
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_identity_map(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  traits text[] := array[]::text[];
  clusters text[] := array[]::text[];
  signals text[] := array[]::text[];
  blend jsonb := '[]'::jsonb;
  v_headline text;
  v_summary text;
  v_pv2_label text;
  v_pv2_summary text;
  v_rep record;
  v_infl record;
  v_plat_band text;
  v_plat_phrase text;
  v_pres record;
  v_room_n bigint;
  v_mast_complete bigint;
  v_mast_total bigint;
  v_set_complete bigint;
  v_hi bigint;
  v_tot bigint;
  v_seasonal bigint;
  v_clubs bigint;
  v_posts bigint;
  v_comments bigint;
  v_scans bigint;
  v_top_rep text;
  v_top_infl text;
  v_taste jsonb;
  v_badge_labels text[];
  v_trait text;
  v_parts text[] := array[]::text[];
begin
  if p_user_id is null then
    return;
  end if;

  perform public.refresh_user_archetypes(p_user_id);

  select * into v_rep from public.user_reputation_graph g where g.user_id = p_user_id;
  select * into v_infl from public.user_influence_graph i where i.user_id = p_user_id;

  if v_rep.user_id is not null then
    v_top_rep := case
      when greatest(
        coalesce(v_rep.helpfulness_score, 0),
        coalesce(v_rep.expertise_score, 0),
        coalesce(v_rep.positivity_score, 0),
        coalesce(v_rep.reliability_score, 0),
        coalesce(v_rep.contribution_score, 0)
      ) <= 0 then null
      when coalesce(v_rep.helpfulness_score, 0) >= greatest(
        coalesce(v_rep.expertise_score, 0),
        coalesce(v_rep.positivity_score, 0),
        coalesce(v_rep.reliability_score, 0),
        coalesce(v_rep.contribution_score, 0)
      ) then 'helpfulness'
      when coalesce(v_rep.expertise_score, 0) >= greatest(
        coalesce(v_rep.positivity_score, 0),
        coalesce(v_rep.reliability_score, 0),
        coalesce(v_rep.contribution_score, 0)
      ) then 'expertise'
      when coalesce(v_rep.positivity_score, 0) >= greatest(
        coalesce(v_rep.reliability_score, 0),
        coalesce(v_rep.contribution_score, 0)
      ) then 'positivity'
      when coalesce(v_rep.reliability_score, 0) >= coalesce(v_rep.contribution_score, 0) then 'reliability'
      else 'contribution'
    end;
    if v_top_rep is not null and greatest(
      coalesce(v_rep.helpfulness_score, 0),
      coalesce(v_rep.expertise_score, 0),
      coalesce(v_rep.positivity_score, 0),
      coalesce(v_rep.reliability_score, 0),
      coalesce(v_rep.contribution_score, 0)
    ) >= 38 then
      traits := array_append(traits, case v_top_rep
        when 'helpfulness' then 'Helpful in the community'
        when 'expertise' then 'Recognized expertise'
        when 'positivity' then 'Positive community energy'
        when 'reliability' then 'Reliable trade partner vibe'
        else 'Steady contributor'
      end);
    end if;
  end if;

  if v_infl.user_id is not null then
    v_top_infl := case
      when greatest(
        coalesce(v_infl.identity_reach_score, 0),
        coalesce(v_infl.contribution_reach_score, 0),
        coalesce(v_infl.expertise_reach_score, 0),
        coalesce(v_infl.social_reach_score, 0),
        coalesce(v_infl.seasonal_reach_score, 0)
      ) <= 0 then null
      when coalesce(v_infl.social_reach_score, 0) >= greatest(
        coalesce(v_infl.identity_reach_score, 0),
        coalesce(v_infl.contribution_reach_score, 0),
        coalesce(v_infl.expertise_reach_score, 0),
        coalesce(v_infl.seasonal_reach_score, 0)
      ) then 'social_reach'
      when coalesce(v_infl.seasonal_reach_score, 0) >= greatest(
        coalesce(v_infl.identity_reach_score, 0),
        coalesce(v_infl.contribution_reach_score, 0),
        coalesce(v_infl.expertise_reach_score, 0)
      ) then 'seasonal_reach'
      when coalesce(v_infl.expertise_reach_score, 0) >= greatest(
        coalesce(v_infl.identity_reach_score, 0),
        coalesce(v_infl.contribution_reach_score, 0)
      ) then 'expertise_reach'
      when coalesce(v_infl.contribution_reach_score, 0) >= coalesce(v_infl.identity_reach_score, 0) then 'contribution_reach'
      else 'identity_reach'
    end;
    if v_top_infl is not null and greatest(
      coalesce(v_infl.identity_reach_score, 0),
      coalesce(v_infl.contribution_reach_score, 0),
      coalesce(v_infl.expertise_reach_score, 0),
      coalesce(v_infl.social_reach_score, 0),
      coalesce(v_infl.seasonal_reach_score, 0)
    ) >= 38 then
      traits := array_append(traits, case v_top_infl
        when 'social_reach' then 'Social reach across the hobby'
        when 'seasonal_reach' then 'Seasonal moments show up in your story'
        when 'expertise_reach' then 'Expertise that travels beyond binders'
        when 'contribution_reach' then 'Contributions that echo outward'
        else 'Identity-forward presence'
      end);
    end if;
  end if;

  select array_agg(distinct trim(p.qualitative_label)) into v_badge_labels
  from (
    select bp.qualitative_label
    from public.user_badge_progress bp
    where bp.user_id = p_user_id
    order by bp.updated_at desc
    limit 6
  ) p;

  if v_badge_labels is not null then
    foreach v_trait in array v_badge_labels
    loop
      if v_trait is not null and length(v_trait) > 0 and not (v_trait = any (traits)) then
        traits := array_append(traits, 'Badge path: ' || v_trait);
      end if;
    end loop;
  end if;

  select up.presence_opt_out, up.last_activity into v_pres
  from public.user_presence up
  where up.user_id = p_user_id;

  if coalesce(v_pres.presence_opt_out, false) then
    traits := array_append(traits, 'Presence kept private');
  elsif v_pres.last_activity is not null and length(trim(v_pres.last_activity)) > 0 then
    traits := array_append(traits, 'Recent focus: ' ||
      case trim(v_pres.last_activity)
        when 'scanning' then 'scanning cards'
        when 'deck_building' then 'deck building'
        when 'binder_editing' then 'binder editing'
        when 'browsing_sets' then 'browsing sets'
        when 'commenting' then 'community threads'
        when 'liking' then 'cheering others on'
        else 'collecting'
      end);
  end if;

  select count(*)::bigint into v_room_n
  from public.collector_room_members crm
  inner join public.collector_rooms cr on cr.room_id = crm.room_id
  where crm.user_id = p_user_id
    and cr.expires_at > now()
    and crm.last_seen_at > now() - interval '14 days';

  if coalesce(v_room_n, 0) >= 1 then
    signals := array_append(signals, 'Shows up in live collector rooms lately');
  end if;

  select
    count(*) filter (where u.is_complete)::bigint,
    count(*)::bigint,
    count(*) filter (where u.mastery_type = 'set' and u.is_complete)::bigint
  into v_mast_complete, v_mast_total, v_set_complete
  from public.user_collection_mastery u
  where u.user_id = p_user_id;

  if coalesce(v_set_complete, 0) >= 2 or (coalesce(v_mast_total, 0) > 0 and coalesce(v_set_complete, 0)::numeric / greatest(v_mast_total, 1) > 0.35) then
    clusters := array_append(clusters, 'Set Specialist');
  end if;
  if coalesce(v_mast_complete, 0) >= 3 then
    clusters := array_append(clusters, 'Completion-minded archivist energy');
  end if;

  select coalesce(c.high_rarity_count, 0)::bigint, coalesce(c.total_cards, 0)::bigint
  into v_hi, v_tot
  from public.user_collection_value_cache c
  where c.user_id = p_user_id;

  if coalesce(v_tot, 0) > 0 and (v_hi::numeric / v_tot::numeric) > 0.1 then
    clusters := array_append(clusters, 'Premium-leaning collection shape');
  elsif coalesce(v_tot, 0) > 40 then
    clusters := array_append(clusters, 'Broad catalog explorer');
  end if;

  select count(*)::bigint into v_seasonal
  from public.seasonal_event_participation s
  where s.user_id = p_user_id;

  if coalesce(v_seasonal, 0) >= 2 then
    clusters := array_append(clusters, 'Seasonal participant');
  end if;

  select count(*)::bigint into v_clubs from public.user_clubs uc where uc.user_id = p_user_id;
  if coalesce(v_clubs, 0) >= 2 then
    clusters := array_append(clusters, 'Multi-club collector');
  elsif coalesce(v_clubs, 0) = 1 then
    traits := array_append(traits, 'Cohort-tagged collector');
  end if;

  select count(*)::bigint into v_posts from public.community_posts cp where cp.author_id = p_user_id;
  select count(*)::bigint into v_comments from public.community_post_comments cc where cc.author_id = p_user_id;

  if coalesce(v_posts, 0) + coalesce(v_comments, 0) >= 8 then
    clusters := array_append(clusters, 'Community Builder');
  elsif coalesce(v_posts, 0) + coalesce(v_comments, 0) >= 2 then
    traits := array_append(traits, 'Community participant');
  end if;

  select count(*)::bigint into v_scans
  from public.scan_events s
  where s.user_id = p_user_id and s.created_at > now() - interval '30 days';

  if coalesce(v_scans, 0) >= 25 then
    traits := array_append(traits, 'Steady scanning rhythm');
  elsif coalesce(v_scans, 0) >= 6 then
    traits := array_append(traits, 'Light scanning cadence');
  end if;

  select c.wave_band into v_plat_band
  from public.collector_activity_wave c
  where c.day_bucket = extract(isodow from timezone('utc', now()))::smallint
    and c.hour_bucket = extract(hour from timezone('utc', now()))::smallint
  limit 1;

  v_plat_phrase := public._identity_platform_wave_phrase(v_plat_band);
  if v_plat_phrase is not null then
    signals := array_append(signals, v_plat_phrase);
  end if;

  select tv.vector into v_taste from public.user_taste_vectors tv where tv.user_id = p_user_id;
  if v_taste is not null then
    if coalesce(v_taste->>'mastery_focus', '') = 'high' then
      traits := array_append(traits, 'Completion-first instincts');
    end if;
    if coalesce(v_taste->>'scan_momentum', '') = 'high' then
      traits := array_append(traits, 'Scanner-forward curiosity');
    end if;
    if coalesce(v_taste->>'community_voice', '') in ('high', 'medium') then
      traits := array_append(traits, 'Voices show up in threads');
    end if;
  end if;

  blend := coalesce((
    select jsonb_agg(t.obj order by t.band_ord, t.uat desc)
    from (
      select
        jsonb_build_object(
          'label', c.label,
          'band', ua.confidence_band,
          'iconKey', c.icon_key
        ) as obj,
        case ua.confidence_band
          when 'Strong fit' then 1
          when 'Good fit' then 2
          when 'Light fit' then 3
          else 4
        end as band_ord,
        ua.updated_at as uat
      from public.user_archetypes ua
      inner join public.archetype_catalog c on c.archetype_id = ua.archetype_id
      where ua.user_id = p_user_id
      order by band_ord, ua.updated_at desc
      limit 3
    ) t
  ), '[]'::jsonb);

  select c.label into v_pv2_label
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

  select string_agg(q.line, ' · ') into v_pv2_summary
  from (
    select (c.label || ' · ' || z.confidence_band) as line
    from (
      select ua.archetype_id, ua.confidence_band
      from public.user_archetypes ua
      where ua.user_id = p_user_id
      order by
        case ua.confidence_band
          when 'Strong fit' then 1
          when 'Good fit' then 2
          when 'Light fit' then 3
          else 4
        end,
        ua.updated_at desc
      limit 3
    ) z
    inner join public.archetype_catalog c on c.archetype_id = z.archetype_id
    order by
      case z.confidence_band
        when 'Strong fit' then 1
        when 'Good fit' then 2
        when 'Light fit' then 3
        else 4
      end
  ) q;

  v_headline := coalesce(v_pv2_label, 'Collector');
  if v_top_rep is not null then
    v_headline := v_headline || ' · ' || case v_top_rep
      when 'helpfulness' then 'Help-forward reputation'
      when 'expertise' then 'Expertise-led reputation'
      when 'positivity' then 'Warm reputation thread'
      when 'reliability' then 'Reliable reputation thread'
      else 'Contributor reputation thread'
    end;
  end if;

  v_parts := array_append(v_parts, coalesce(v_pv2_summary, v_pv2_label));
  if coalesce(v_posts, 0) + coalesce(v_comments, 0) >= 2 then
    v_parts := array_append(v_parts, 'Community participation shows in your public story.');
  end if;
  if coalesce(v_room_n, 0) >= 1 then
    v_parts := array_append(v_parts, 'You drift through live collector rooms when topics heat up.');
  end if;
  if coalesce(v_seasonal, 0) >= 1 then
    v_parts := array_append(v_parts, 'Seasonal events appear in your collecting arc.');
  end if;
  v_summary := array_to_string(v_parts, ' ');

  insert into public.user_identity_map (user_id, identity, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'identityHeadline', v_headline,
      'identitySummary', left(coalesce(v_summary, v_headline), 520),
      'identityTraits', coalesce(to_jsonb(traits), '[]'::jsonb),
      'identityClusters', coalesce(to_jsonb(clusters), '[]'::jsonb),
      'identitySignals', coalesce(to_jsonb(signals), '[]'::jsonb),
      'identityArchetypeBlend', blend,
      'personaV2Label', v_pv2_label,
      'personaV2Summary', v_pv2_summary
    ),
    now()
  )
  on conflict (user_id) do update set
    identity = excluded.identity,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_identity_map(uuid) from public;
grant execute on function public.refresh_user_identity_map(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Stale check + RPCs
-- ---------------------------------------------------------------------------

create or replace function public._identity_map_stale(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select
      uim.updated_at is null
      or uim.updated_at < (now() - interval '30 hours')
    from public.user_identity_map uim
    where uim.user_id = p_user_id),
    true
  );
$$;

revoke all on function public._identity_map_stale(uuid) from public;

create or replace function public.get_user_identity_map(p_user_id uuid)
returns table (
  identity jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if public._identity_map_stale(p_user_id) then
    perform public.refresh_user_identity_map(p_user_id);
  end if;

  return query
  select m.identity, m.updated_at
  from public.user_identity_map m
  where m.user_id = p_user_id;
end;
$$;

revoke all on function public.get_user_identity_map(uuid) from public;
grant execute on function public.get_user_identity_map(uuid) to authenticated;

create or replace function public.get_users_identity_map_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  identity jsonb,
  updated_at timestamptz
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
    if uid is not null and public._identity_map_stale(uid) then
      perform public.refresh_user_identity_map(uid);
    end if;
  end loop;

  return query
  select m.user_id, m.identity, m.updated_at
  from public.user_identity_map m
  where m.user_id = any (p_user_ids);
end;
$$;

revoke all on function public.get_users_identity_map_batch(uuid[]) from public;
grant execute on function public.get_users_identity_map_batch(uuid[]) to authenticated;

create or replace function public.get_identity_spotlights(p_limit int default 4)
returns table (
  spotlight_key text,
  headline text,
  blurb text
)
language sql
stable
security definer
set search_path = public
as $$
  with lim as (select greatest(1, least(coalesce(p_limit, 4), 12))::int as n)
  select *
  from (
    values
      ('set_specialist', 'Set Specialist', 'Collectors who keep catalog arcs tidy and love finishing set stories.'),
      ('community_builder', 'Community Builder', 'Trainers who light up threads, clubs, and mutual follows.'),
      ('evening_collector', 'Evening Collector', 'Night-owl rhythm — scans and binders after the day winds down.'),
      ('seasonal_regular', 'Seasonal Regular', 'Seasonal events and limited windows shape their collecting year.'),
      ('room_wanderer', 'Ambient Room Wanderer', 'Drifts through live rooms when sets, clubs, or the feed hum.'),
      ('completion_archivist', 'Completion Archivist', 'Binders and sets brought to the finish line with patience.')
  ) as t(spotlight_key, headline, blurb)
  cross join lim
  order by md5(t.spotlight_key || ':' || (current_date)::text), t.spotlight_key
  limit (select n from lim);
$$;

revoke all on function public.get_identity_spotlights(int) from public;
grant execute on function public.get_identity_spotlights(int) to authenticated;
