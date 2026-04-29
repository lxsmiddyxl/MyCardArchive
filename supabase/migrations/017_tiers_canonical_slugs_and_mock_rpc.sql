-- Canonical tier slugs on public.tiers (free, pro, elite).
-- mock_upgrade_user_tier: legacy slug mapping, upsert user_tiers, returns jsonb.

delete from public.tiers where lower(slug) = 'apex';

delete from public.tiers e
where lower(e.slug) = 'ember'
  and exists (
    select 1 from public.tiers f
    where lower(f.slug) = 'free' and f.id <> e.id
  );

delete from public.tiers s
where lower(s.slug) = 'spark'
  and exists (
    select 1 from public.tiers p
    where lower(p.slug) = 'pro' and p.id <> s.id
  );

delete from public.tiers n
where lower(n.slug) = 'nova'
  and exists (
    select 1 from public.tiers el
    where lower(el.slug) = 'elite' and el.id <> n.id
  );

update public.tiers
set
  slug = 'elite',
  name = 'Elite',
  description = coalesce(description, 'Top tier.')
where lower(slug) = 'nova';

update public.tiers
set
  slug = 'pro',
  name = 'Pro',
  description = coalesce(description, 'More room to grow.')
where lower(slug) = 'spark';

update public.tiers
set
  slug = 'free',
  name = 'Free',
  description = coalesce(description, 'Starter — get your collection online.')
where lower(slug) = 'ember';

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
select 'Free', 'free', 'Starter — get your collection online.', 0, 0, 1, 500, 50, 1
where not exists (select 1 from public.tiers where lower(slug) = 'free');

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
select 'Pro', 'pro', 'More room to grow.', 4.99, 49.99, 5, 5000, 500, 2
where not exists (select 1 from public.tiers where lower(slug) = 'pro');

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
select 'Elite', 'elite', 'Maximum capacity.', 19.99, 199.99, 50, 50000, 5000, 3
where not exists (select 1 from public.tiers where lower(slug) = 'elite');

drop function if exists public.mock_upgrade_user_tier(text);

create function public.mock_upgrade_user_tier(p_tier_slug text)
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
    else 'free'
  end;

  v_binders := case v_tier
    when 'free' then 1
    when 'pro' then 5
    when 'elite' then 50
  end;

  v_cards := case v_tier
    when 'free' then 500
    when 'pro' then 5000
    when 'elite' then 50000
  end;

  v_scans := case v_tier
    when 'free' then 50
    when 'pro' then 500
    when 'elite' then 5000
  end;

  insert into public.user_tiers (user_id, tier_slug, binder_limit, card_limit, scan_limit)
  values (v_uid, v_tier, v_binders, v_cards, v_scans)
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

comment on function public.mock_upgrade_user_tier(text) is
  'Dev: upsert user_tiers from tier_slug (free/pro/elite + legacy aliases). Returns jsonb.';

revoke all on function public.mock_upgrade_user_tier(text) from public;
grant execute on function public.mock_upgrade_user_tier(text) to authenticated;

notify pgrst, 'reload schema';
