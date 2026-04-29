-- Phase 4: tier system (tiers catalog, per-user assignments, scan usage events)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  monthly_price numeric(12, 2) not null default 0,
  yearly_price numeric(12, 2) not null default 0,
  binder_limit integer,
  card_limit integer,
  scan_limit integer,
  created_at timestamptz not null default now(),
  sort_order integer not null default 0,
  constraint tiers_slug_key unique (slug)
);

comment on table public.tiers is 'Subscription tier catalog (limits and pricing).';

create table public.user_tiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier_id uuid not null references public.tiers (id) on delete restrict,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true
);

comment on table public.user_tiers is 'User tier assignments over time; at most one active row per user.';

create unique index user_tiers_one_active_per_user
  on public.user_tiers (user_id)
  where is_active;

create index user_tiers_user_id_idx on public.user_tiers (user_id);

create table public.scan_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, created_at)
);

comment on table public.scan_events is 'Append-only scan usage events per user.';

create index scan_events_user_id_created_at_idx
  on public.scan_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed tiers: Ember, Spark, Nova, Apex
-- ---------------------------------------------------------------------------

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
values
  (
    'Ember',
    'ember',
    'Starter — get your collection online.',
    0,
    0,
    1,
    500,
    50,
    1
  ),
  (
    'Spark',
    'spark',
    'More room to grow.',
    4.99,
    49.99,
    3,
    2500,
    500,
    2
  ),
  (
    'Nova',
    'nova',
    'Serious collectors.',
    9.99,
    99.99,
    10,
    15000,
    2500,
    3
  ),
  (
    'Apex',
    'apex',
    'Maximum capacity.',
    19.99,
    199.99,
    null,
    null,
    null,
    4
  );

-- ---------------------------------------------------------------------------
-- Default tier on signup + backfill
-- ---------------------------------------------------------------------------

create or replace function public.assign_default_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ember_id uuid;
begin
  select id
  into v_ember_id
  from public.tiers
  where slug = 'ember'
  limit 1;

  if v_ember_id is null then
    raise exception 'assign_default_tier: tier slug ''ember'' not found';
  end if;

  insert into public.user_tiers (user_id, tier_id, started_at, expires_at, is_active)
  values (new.id, v_ember_id, now(), null, true);

  return new;
end;
$$;

comment on function public.assign_default_tier() is 'Assigns Ember tier to a new auth user.';

drop trigger if exists on_auth_user_created_assign_default_tier on auth.users;

create trigger on_auth_user_created_assign_default_tier
  after insert on auth.users
  for each row
  execute procedure public.assign_default_tier();

-- Existing users without an active tier → Ember
insert into public.user_tiers (user_id, tier_id, started_at, expires_at, is_active)
select u.id, t.id, now(), null, true
from auth.users u
cross join public.tiers t
where t.slug = 'ember'
  and not exists (
    select 1
    from public.user_tiers ut
    where ut.user_id = u.id
      and ut.is_active = true
  );

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tiers enable row level security;
alter table public.user_tiers enable row level security;
alter table public.scan_events enable row level security;

-- Tiers: public catalog
create policy "Anyone can read tiers"
  on public.tiers
  for select
  to anon, authenticated
  using (true);

-- user_tiers: own rows only
create policy "Users can read own tier rows"
  on public.user_tiers
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete for clients; assignments via triggers / SECURITY DEFINER functions

-- scan_events: insert and read own
create policy "Users can insert own scan events"
  on public.scan_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own scan events"
  on public.scan_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Mock tier upgrade (dev / testing)
-- ---------------------------------------------------------------------------

create or replace function public.mock_upgrade_user_tier(p_tier_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into v_tier_id
  from public.tiers
  where slug = p_tier_slug;

  if v_tier_id is null then
    raise exception 'Unknown tier slug: %', p_tier_slug;
  end if;

  update public.user_tiers
  set is_active = false
  where user_id = v_uid
    and is_active = true;

  insert into public.user_tiers (user_id, tier_id, started_at, expires_at, is_active)
  values (v_uid, v_tier_id, now(), null, true);
end;
$$;

comment on function public.mock_upgrade_user_tier(text) is 'TESTING: switches caller to the given tier slug (deactivates prior active row).';

revoke all on function public.mock_upgrade_user_tier(text) from public;
grant execute on function public.mock_upgrade_user_tier(text) to authenticated;
