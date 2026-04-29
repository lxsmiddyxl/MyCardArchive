-- Business tier: high-volume plan (shops, graders). Limits from `tiers` row; RPCs accept `business`.

insert into public.tiers (
  name,
  slug,
  description,
  monthly_price,
  yearly_price,
  binder_limit,
  card_limit,
  scan_limit,
  sort_order
)
select
  'Business',
  'business',
  'Built for shops, graders, and high-volume sellers.',
  49.99,
  499.99,
  50,
  50000,
  20000,
  4
where not exists (select 1 from public.tiers where lower(slug) = 'business');

create or replace function public.apply_billing_user_tier(
  p_user_id uuid,
  p_tier_slug text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_tier_slug, '')));
  v_binders int;
  v_cards int;
  v_scans int;
begin
  if v_slug not in ('free', 'pro', 'elite', 'business') then
    raise exception 'apply_billing_user_tier: invalid tier_slug %', p_tier_slug;
  end if;

  select t.binder_limit, t.card_limit, t.scan_limit
    into v_binders, v_cards, v_scans
  from public.tiers t
  where lower(t.slug) = v_slug
  limit 1;

  if v_binders is null or v_cards is null or v_scans is null then
    v_binders := case v_slug
      when 'free' then 1 when 'pro' then 5 when 'elite' then 50 when 'business' then 50 end;
    v_cards := case v_slug
      when 'free' then 500 when 'pro' then 5000 when 'elite' then 50000 when 'business' then 50000 end;
    v_scans := case v_slug
      when 'free' then 50 when 'pro' then 500 when 'elite' then 5000 when 'business' then 20000 end;
  end if;

  insert into public.user_tiers (
    user_id,
    tier_slug,
    binder_limit,
    card_limit,
    scan_limit,
    bonus_scans_remaining
  )
  values (p_user_id, v_slug, v_binders, v_cards, v_scans, 0)
  on conflict (user_id) do update set
    tier_slug = excluded.tier_slug,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit,
    updated_at = now();
  -- bonus_scans_remaining intentionally unchanged on update (see 072_user_tiers_bonus_scans).
end;
$$;

create or replace function public.mock_upgrade_user_tier(p_tier_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier text;
  v_binders int;
  v_cards int;
  v_scans int;
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'Not authenticated'
    );
  end if;

  v_tier := case lower(trim(coalesce(p_tier_slug, '')))
    when 'ember' then 'free'
    when 'spark' then 'pro'
    when 'nova' then 'elite'
    when 'apex' then 'elite'
    when 'free' then 'free'
    when 'pro' then 'pro'
    when 'elite' then 'elite'
    when 'business' then 'business'
    else 'free'
  end;

  v_binders := case v_tier
    when 'free' then 1
    when 'pro' then 5
    when 'elite' then 50
    when 'business' then 50
  end;

  v_cards := case v_tier
    when 'free' then 500
    when 'pro' then 5000
    when 'elite' then 50000
    when 'business' then 50000
  end;

  v_scans := case v_tier
    when 'free' then 50
    when 'pro' then 500
    when 'elite' then 5000
    when 'business' then 20000
  end;

  insert into public.user_tiers (
    user_id,
    tier_slug,
    binder_limit,
    card_limit,
    scan_limit,
    bonus_scans_remaining
  )
  values (v_uid, v_tier, v_binders, v_cards, v_scans, 0)
  on conflict (user_id) do update set
    tier_slug = excluded.tier_slug,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'tier_slug', v_tier,
    'binder_limit', v_binders,
    'card_limit', v_cards,
    'scan_limit', v_scans
  );
end;
$$;

notify pgrst, 'reload schema';
