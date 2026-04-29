-- Stripe billing: customer mapping + service-role-only tier updates for webhooks.

create table if not exists public.stripe_customers (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.stripe_customers is
  'Maps Supabase auth user → Stripe customer id. Written only via service role (API routes / webhooks).';

create index if not exists stripe_customers_stripe_customer_id_idx
  on public.stripe_customers (stripe_customer_id);

alter table public.stripe_customers enable row level security;

-- Authenticated users can read their own mapping (portal + UI). No direct client writes.
drop policy if exists "stripe_customers_select_own" on public.stripe_customers;
create policy "stripe_customers_select_own"
  on public.stripe_customers
  for select
  using (auth.uid() = user_id);

-- Webhooks and server routes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

-- ---------------------------------------------------------------------------
-- apply_billing_user_tier: validated upsert into user_tiers from catalog tiers
-- Execute: service_role only (Next.js webhook + billing API with service key).
-- ---------------------------------------------------------------------------

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
    scan_limit
  )
  values (p_user_id, v_slug, v_binders, v_cards, v_scans)
  on conflict (user_id) do update set
    tier_slug = excluded.tier_slug,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit,
    updated_at = now();
end;
$$;

comment on function public.apply_billing_user_tier(uuid, text) is
  'Billing webhooks: set user_tiers from canonical tier slug (free/pro/elite). Service role only.';

revoke all on function public.apply_billing_user_tier(uuid, text) from public;
grant execute on function public.apply_billing_user_tier(uuid, text) to service_role;

notify pgrst, 'reload schema';
