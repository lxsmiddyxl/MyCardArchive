-- Optional monthly scan cap per user (null = unlimited).

alter table public.user_tiers
  add column if not exists scan_limit int null;

comment on column public.user_tiers.scan_limit is
  'Maximum scan_events per calendar month; null means no limit.';

update public.user_tiers
set scan_limit = 50
where tier = 'free'
  and scan_limit is null;

update public.user_tiers
set scan_limit = 500
where tier = 'pro'
  and scan_limit is null;

update public.user_tiers
set scan_limit = 5000
where tier = 'elite'
  and scan_limit is null;

create or replace function public.assign_default_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tiers (user_id, tier, binder_limit, card_limit, scan_limit)
  values (new.id, 'free', 1, 500, 50)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.mock_upgrade_user_tier(p_tier_slug text)
returns void
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
    raise exception 'Not authenticated';
  end if;

  v_tier := case lower(coalesce(p_tier_slug, ''))
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

  insert into public.user_tiers (user_id, tier, binder_limit, card_limit, scan_limit)
  values (v_uid, v_tier, v_binders, v_cards, v_scans)
  on conflict (user_id) do update set
    tier = excluded.tier,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit,
    updated_at = now();
end;
$$;

notify pgrst, 'reload schema';
