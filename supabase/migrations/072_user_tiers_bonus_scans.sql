-- One-time scan pack add-ons: bonus pool decremented after plan monthly pool is exhausted per scan.

alter table public.user_tiers
  add column if not exists bonus_scans_remaining integer not null default 0;

comment on column public.user_tiers.bonus_scans_remaining is
  'Purchased one-time scan credits. Consumed only after monthly scan_events count reaches scan_limit for the tier.';

alter table public.user_tiers
  drop constraint if exists user_tiers_bonus_scans_remaining_nonnegative;
alter table public.user_tiers
  add constraint user_tiers_bonus_scans_remaining_nonnegative
  check (bonus_scans_remaining >= 0);

-- Idempotent grants from Stripe Checkout (payment mode) for scan packs.
create table if not exists public.stripe_scan_pack_grants (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bonus_scans int not null check (bonus_scans > 0),
  pack_id text not null,
  created_at timestamptz not null default now()
);

comment on table public.stripe_scan_pack_grants is
  'Records applied scan-pack checkout sessions (webhook idempotency). Service role writes only.';

alter table public.stripe_scan_pack_grants enable row level security;

-- apply_billing_user_tier: preserve bonus_scans_remaining when subscription tier changes
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
  if v_slug not in ('free', 'pro', 'elite') then
    raise exception 'apply_billing_user_tier: invalid tier_slug %', p_tier_slug;
  end if;

  select t.binder_limit, t.card_limit, t.scan_limit
    into v_binders, v_cards, v_scans
  from public.tiers t
  where lower(t.slug) = v_slug
  limit 1;

  if v_binders is null or v_cards is null or v_scans is null then
    v_binders := case v_slug
      when 'free' then 1 when 'pro' then 5 when 'elite' then 50 end;
    v_cards := case v_slug
      when 'free' then 500 when 'pro' then 5000 when 'elite' then 50000 end;
    v_scans := case v_slug
      when 'free' then 50 when 'pro' then 500 when 'elite' then 5000 end;
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
end;
$$;

-- mock_upgrade_user_tier: preserve bonus on tier switch
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

-- After recording a scan_event, decrement bonus when this scan drew from the bonus pool.
create or replace function public.consume_bonus_scan_if_needed(
  p_user_id uuid,
  p_used_count_after int,
  p_scan_limit int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'consume_bonus_scan_if_needed: forbidden';
  end if;
  if p_scan_limit is null or p_scan_limit <= 0 then
    return;
  end if;
  if p_used_count_after <= p_scan_limit then
    return;
  end if;
  update public.user_tiers ut
  set
    bonus_scans_remaining = ut.bonus_scans_remaining - 1,
    updated_at = now()
  where ut.user_id = p_user_id
    and ut.bonus_scans_remaining > 0;
end;
$$;

comment on function public.consume_bonus_scan_if_needed(uuid, int, int) is
  'When monthly scan count exceeds plan scan_limit, consume one purchased bonus scan. Caller must be the same user (RLS-safe via auth.uid check below).';

revoke all on function public.consume_bonus_scan_if_needed(uuid, int, int) from public;
grant execute on function public.consume_bonus_scan_if_needed(uuid, int, int) to authenticated;

-- Service-role only: add purchased bonus scans (webhook after idempotent grant insert).
create or replace function public.increment_bonus_scans_remaining(
  p_user_id uuid,
  p_delta int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta is null or p_delta <= 0 then
    return;
  end if;
  update public.user_tiers ut
  set
    bonus_scans_remaining = ut.bonus_scans_remaining + p_delta,
    updated_at = now()
  where ut.user_id = p_user_id;
end;
$$;

revoke all on function public.increment_bonus_scans_remaining(uuid, int) from public;
grant execute on function public.increment_bonus_scans_remaining(uuid, int) to service_role;

notify pgrst, 'reload schema';
