-- Profile feed: qualitative Feed v3 “why you’re seeing this” lines (no numeric scores on the wire).
-- Batched RPC for /api/profile/[id]/feed — mirrors global feed v3 signals as prose only.

create or replace function public._feed_v3_profile_one_signal_line(
  p_viewer uuid,
  p_actor_id uuid,
  p_event_kind text,
  p_subject_id uuid,
  p_created_at timestamptz
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[] := array[]::text[];
  v_mutual boolean := false;
  v_traits boolean := false;
  v_arch boolean := false;
  v_pres boolean := false;
  v_sets boolean := false;
  v_mkt boolean := false;
  v_post_warm boolean := false;
  v_kind text := lower(trim(coalesce(p_event_kind, '')));
begin
  if p_viewer is null or p_actor_id is null then
    return null;
  end if;

  if p_viewer = p_actor_id then
    parts := array_append(parts, 'This is your own public activity rail on your profile.');
  else
    select exists (
      select 1
      from public.social_mutual_pairs smp
      where (smp.user_low = p_viewer and smp.user_high = p_actor_id)
         or (smp.user_high = p_viewer and smp.user_low = p_actor_id)
    ) into v_mutual;

    if v_mutual then
      parts := array_append(parts, 'You follow each other — their moments sit a little closer on your social map.');
    end if;

    select exists (
      select 1
      from public.user_identity_map im1
      cross join lateral jsonb_array_elements_text(coalesce(im1.identity->'identityTraits', '[]'::jsonb)) tv(trait)
      inner join public.user_identity_map im2 on im2.user_id = p_actor_id
      cross join lateral jsonb_array_elements_text(coalesce(im2.identity->'identityTraits', '[]'::jsonb)) ta(trait)
        on tv.trait = ta.trait
      where im1.user_id = p_viewer
    ) into v_traits;

    if v_traits then
      parts := array_append(parts, 'Some of your public collector traits echo theirs — a soft identity match.');
    end if;

    select exists (
      select 1
      from public.user_archetypes ua1
      inner join public.user_archetypes ua2
        on ua2.user_id = p_actor_id
       and ua2.archetype_id = ua1.archetype_id
      where ua1.user_id = p_viewer
    ) into v_arch;

    if v_arch then
      parts := array_append(parts, 'Your collector archetypes overlap in a few hobby lanes.');
    end if;

    select exists (
      select 1
      from public.user_presence up
      where up.user_id = p_actor_id
        and coalesce(up.presence_opt_out, false) = false
        and up.last_seen_at > now() - interval '30 minutes'
    ) into v_pres;

    if v_pres then
      parts := array_append(parts, 'They have been around the hub recently — presence feels nearby.');
    end if;

    select exists (
      select 1
      from public.cards c1
      inner join public.catalog_cards cc1 on cc1.id = c1.catalog_card_id
      inner join public.cards c2 on c2.user_id = p_actor_id and c2.catalog_card_id is not null
      inner join public.catalog_cards cc2 on cc2.id = c2.catalog_card_id and cc2.set_id = cc1.set_id
      where c1.user_id = p_viewer
        and c1.catalog_card_id is not null
      limit 1
    ) into v_sets;

    if v_sets then
      parts := array_append(parts, 'Your binders trace some of the same catalog sets.');
    end if;

    select exists (
      select 1
      from public.cards c1
      inner join public.cards c2
        on c2.user_id = p_actor_id
       and c1.catalog_card_id = c2.catalog_card_id
       and c1.catalog_card_id is not null
      where c1.user_id = p_viewer
        and (
          (c1.for_trade = true or c1.looking_for = true)
          and (c2.for_trade = true or c2.looking_for = true)
        )
      limit 1
    ) into v_mkt;

    if v_mkt then
      parts := array_append(parts, 'Marketplace posture overlaps — trades or wants may line up quietly.');
    end if;
  end if;

  if v_kind = 'post' and p_subject_id is not null then
    select coalesce(
      (
        select count(*) >= 5
        from public.community_post_likes l
        where l.post_id = p_subject_id
      ),
      false
    ) into v_post_warm;
    if v_post_warm then
      parts := array_append(parts, 'This community post picked up broader trainer interest.');
    else
      parts := array_append(parts, 'A community post moment — calmer energy than a viral thread.');
    end if;
  elsif v_kind = 'post' then
    parts := array_append(parts, 'A community-facing moment from their timeline.');
  elsif v_kind = 'like' then
    parts := array_append(parts, 'Someone cheered a thread — a lightweight community pulse.');
  elsif v_kind = 'comment' then
    parts := array_append(parts, 'Conversation showed up on a thread — voices stacking gently.');
  elsif v_kind = 'follow' then
    parts := array_append(parts, 'A follow moment — the social graph shifted a little.');
  elsif v_kind = 'market_offer' then
    parts := array_append(parts, 'Marketplace pulse — an offer or listing signal from their side.');
  elsif length(v_kind) > 0 then
    parts := array_append(parts, 'A public hobby signal from their collecting story.');
  end if;

  if p_created_at is not null and p_created_at > now() - interval '48 hours' then
    parts := array_append(parts, 'Fairly fresh on the clock for this profile rail.');
  end if;

  if cardinality(parts) = 0 then
    return 'You are browsing this trainer profile — their public feed moments appear here in time order.';
  end if;

  return left(array_to_string(parts, ' '), 520);
end;
$$;

revoke all on function public._feed_v3_profile_one_signal_line(uuid, uuid, text, uuid, timestamptz) from public;

create or replace function public.get_profile_feed_v3_signal_lines(p_actor_id uuid, p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  out jsonb := '{}'::jsonb;
  rec record;
begin
  if uid is null then
    return '{}'::jsonb;
  end if;
  if p_actor_id is null then
    return '{}'::jsonb;
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return '{}'::jsonb;
  end if;

  for rec in
    select *
    from jsonb_to_recordset(p_events) as x(
      id uuid,
      kind text,
      subject_id uuid,
      created_at timestamptz
    )
  loop
    if rec.id is null then
      continue;
    end if;
    out := out || jsonb_build_object(
      rec.id::text,
      public._feed_v3_profile_one_signal_line(
        uid,
        p_actor_id,
        rec.kind,
        rec.subject_id,
        rec.created_at
      )
    );
  end loop;

  return out;
end;
$$;

comment on function public.get_profile_feed_v3_signal_lines(uuid, jsonb) is
  'Qualitative Feed v3 lines for profile activity — batched JSON map feed_event_id → prose (no scores).';

revoke all on function public.get_profile_feed_v3_signal_lines(uuid, jsonb) from public;
grant execute on function public.get_profile_feed_v3_signal_lines(uuid, jsonb) to authenticated;
