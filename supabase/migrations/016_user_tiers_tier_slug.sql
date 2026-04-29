-- 016: Rebuild public.user_tiers — PK user_id, tier_slug, limits (all NOT NULL).
-- Legacy (tier_id / started_at / expires_at / is_active): rename → copy → drop old.
-- Idempotent: if tier_slug already exists and tier_id does not, only repairs + RLS.

-- ---------------------------------------------------------------------------
-- Pre: pause signup tier hook (recreated at end)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created_assign_default_tier on auth.users;

-- ---------------------------------------------------------------------------
-- Branch: legacy vs new
-- ---------------------------------------------------------------------------

do $body$
begin
  -- New schema already applied
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_tiers'
      and column_name = 'tier_slug'
  )


  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_tiers'
      and column_name = 'tier_id'
  ) then
    raise notice '016: user_tiers already new shape; applying column/RLS repair only';
    return;
  end if;

  -- Legacy shape (tier_id, ...)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_tiers'
      and column_name = 'tier_id'
  ) then
    raise notice '016: migrating legacy user_tiers → tier_slug + PK user_id';

    drop policy if exists "user_tiers_select_own" on public.user_tiers;
    drop policy if exists "user_tiers_insert_own" on public.user_tiers;
    drop policy if exists "user_tiers_update_own" on public.user_tiers;
    drop policy if exists "user_tiers_delete_own" on public.user_tiers;
    drop trigger if exists user_tiers_set_updated_at on public.user_tiers;

    alter table public.user_tiers rename to user_tiers_old;

    create table public.user_tiers (
      user_id uuid primary key references auth.users (id) on delete cascade,
      tier_slug text not null,
      binder_limit int not null,
      card_limit int not null,
      scan_limit int not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists user_tiers_user_id_idx on public.user_tiers (user_id);

    insert into public.user_tiers (
      user_id,
      tier_slug,
      binder_limit,
      card_limit,
      scan_limit
    )
    select
      user_id,
      'free',
      1,
      500,
      50
    from public.user_tiers_old
    group by user_id;

    drop table public.user_tiers_old;
    return;
  end if;

  -- Legacy shape v2 (id, user_id, tier, binder_limit, card_limit, scan_limit?)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_tiers'
      and column_name = 'tier'
  ) then
    raise notice '016: migrating user_tiers(tier) → tier_slug + PK user_id';

    drop policy if exists "user_tiers_select_own" on public.user_tiers;
    drop policy if exists "user_tiers_insert_own" on public.user_tiers;
    drop policy if exists "user_tiers_update_own" on public.user_tiers;
    drop policy if exists "user_tiers_delete_own" on public.user_tiers;
    drop trigger if exists user_tiers_set_updated_at on public.user_tiers;

    alter table public.user_tiers rename to user_tiers_old;

    create table public.user_tiers (
      user_id uuid primary key references auth.users (id) on delete cascade,
      tier_slug text not null,
      binder_limit int not null,
      card_limit int not null,
      scan_limit int not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists user_tiers_user_id_idx on public.user_tiers (user_id);

    insert into public.user_tiers (
      user_id,
      tier_slug,
      binder_limit,
      card_limit,
      scan_limit,
      created_at,
      updated_at
    )
    select
      user_id,
      lower(trim(coalesce(tier, 'free'))),
      binder_limit,
      card_limit,
      coalesce(scan_limit, 50),
      coalesce(created_at, now()),
      coalesce(updated_at, now())
    from public.user_tiers_old;

    drop table public.user_tiers_old;
    return;
  end if;

  -- Fresh create if table missing
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_tiers'
  ) then
    create table public.user_tiers (
      user_id uuid primary key references auth.users (id) on delete cascade,
      tier_slug text not null,
      binder_limit int not null,
      card_limit int not null,
      scan_limit int not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists user_tiers_user_id_idx on public.user_tiers (user_id);
    return;
  end if;

  raise exception '016: public.user_tiers has an unknown shape; inspect columns manually';
end
$body$;

-- ---------------------------------------------------------------------------
-- Repair: nullable scan_limit / missing NOT NULL (partial runs)
-- ---------------------------------------------------------------------------

update public.user_tiers
set scan_limit = 50
where scan_limit is null;

alter table public.user_tiers
  alter column scan_limit set not null;

alter table public.user_tiers
  alter column scan_limit set default 50;

-- ---------------------------------------------------------------------------
-- updated_at trigger (requires 011 set_updated_at)
-- ---------------------------------------------------------------------------

drop trigger if exists user_tiers_set_updated_at on public.user_tiers;

create trigger user_tiers_set_updated_at
  before update on public.user_tiers
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (SELECT / INSERT / UPDATE only)
-- ---------------------------------------------------------------------------

alter table public.user_tiers enable row level security;

drop policy if exists "user_tiers_select_own" on public.user_tiers;
drop policy if exists "user_tiers_insert_own" on public.user_tiers;
drop policy if exists "user_tiers_update_own" on public.user_tiers;
drop policy if exists "user_tiers_delete_own" on public.user_tiers;

create policy "user_tiers_select_own"
  on public.user_tiers
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_tiers_insert_own"
  on public.user_tiers
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_tiers_update_own"
  on public.user_tiers
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.user_tiers from authenticated;
grant select, insert, update on table public.user_tiers to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill users without a row
-- ---------------------------------------------------------------------------

insert into public.user_tiers (user_id, tier_slug, binder_limit, card_limit, scan_limit)
select u.id, 'free', 1, 500, 50
from auth.users u
where not exists (
  select 1 from public.user_tiers ut where ut.user_id = u.id
)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Signup: default tier row
-- ---------------------------------------------------------------------------

create or replace function public.assign_default_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tiers (user_id, tier_slug, binder_limit, card_limit, scan_limit)
  values (new.id, 'free', 1, 500, 50)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mock upgrade (dev / tier page)
-- ---------------------------------------------------------------------------

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

  insert into public.user_tiers (user_id, tier_slug, binder_limit, card_limit, scan_limit)
  values (v_uid, v_tier, v_binders, v_cards, v_scans)
  on conflict (user_id) do update set
    tier_slug = excluded.tier_slug,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit,
    updated_at = now();
end;
$$;

revoke all on function public.mock_upgrade_user_tier(text) from public;
grant execute on function public.mock_upgrade_user_tier(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Auth trigger
-- ---------------------------------------------------------------------------

create trigger on_auth_user_created_assign_default_tier
  after insert on auth.users
  for each row
  execute function public.assign_default_tier();

notify pgrst, 'reload schema';
