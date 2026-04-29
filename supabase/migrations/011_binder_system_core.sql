-- Binder system core: binders, cards (binder-owned), scan_events, user_tiers (text tier + limits).
-- Reshapes prior binder_cards / legacy cards / composite scan_events / catalog-linked user_tiers.

-- ---------------------------------------------------------------------------
-- Tear down dependents
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created_assign_default_tier on auth.users;

drop function if exists public.mock_upgrade_user_tier(text);

-- CASCADE drops dependent FK objects (e.g. binder_cards → cards) and policies.
drop table if exists public.scan_events cascade;
drop table if exists public.user_tiers cascade;
drop table if exists public.cards cascade;

-- ---------------------------------------------------------------------------
-- binders — align with auth.users + timestamps
-- ---------------------------------------------------------------------------

alter table public.binders
  drop constraint if exists binders_user_id_fkey;

alter table public.binders
  add column if not exists description text,
  add column if not exists updated_at timestamptz not null default now();

update public.binders
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.binders
  alter column name set not null;

update public.binders
set created_at = coalesce(created_at, now())
where created_at is null;

alter table public.binders
  alter column created_at set not null;

alter table public.binders
  alter column created_at set default now();

alter table public.binders
  add constraint binders_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

drop trigger if exists binders_set_updated_at on public.binders;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger binders_set_updated_at
  before update on public.binders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  number text,
  rarity text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_binder_id_idx on public.cards (binder_id);
create index cards_user_id_idx on public.cards (user_id);

create trigger cards_set_updated_at
  before update on public.cards
  for each row
  execute function public.set_updated_at();

comment on table public.cards is 'Trading cards stored in a binder; scoped by user_id and binder_id.';

-- ---------------------------------------------------------------------------
-- scan_events
-- ---------------------------------------------------------------------------

create table public.scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  raw_text text,
  created_at timestamptz not null default now()
);

create index scan_events_user_id_created_at_idx
  on public.scan_events (user_id, created_at desc);

create index scan_events_card_id_idx on public.scan_events (card_id);

-- ---------------------------------------------------------------------------
-- user_tiers (one row per user)
-- ---------------------------------------------------------------------------

create table public.user_tiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null check (tier in ('free', 'pro', 'elite')),
  binder_limit int not null,
  card_limit int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tiers_user_id_key unique (user_id)
);

create index user_tiers_user_id_idx on public.user_tiers (user_id);

create trigger user_tiers_set_updated_at
  before update on public.user_tiers
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.binders enable row level security;

drop policy if exists "binders_select_own" on public.binders;
drop policy if exists "binders_insert_own" on public.binders;
drop policy if exists "binders_update_own" on public.binders;
drop policy if exists "binders_delete_own" on public.binders;

create policy "binders_select_own"
  on public.binders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "binders_insert_own"
  on public.binders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "binders_update_own"
  on public.binders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "binders_delete_own"
  on public.binders
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.cards enable row level security;

create policy "cards_select_own"
  on public.cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "cards_insert_own"
  on public.cards
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.binders b
      where b.id = binder_id
        and b.user_id = auth.uid()
    )
  );

create policy "cards_update_own"
  on public.cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.binders b
      where b.id = binder_id
        and b.user_id = auth.uid()
    )
  );

create policy "cards_delete_own"
  on public.cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.scan_events enable row level security;

create policy "scan_events_select_own"
  on public.scan_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "scan_events_insert_own"
  on public.scan_events
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      card_id is null
      or exists (
        select 1
        from public.cards c
        where c.id = card_id
          and c.user_id = auth.uid()
      )
    )
  );

create policy "scan_events_update_own"
  on public.scan_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      card_id is null
      or exists (
        select 1
        from public.cards c
        where c.id = card_id
          and c.user_id = auth.uid()
      )
    )
  );

create policy "scan_events_delete_own"
  on public.scan_events
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.user_tiers enable row level security;

create policy "user_tiers_select_own"
  on public.user_tiers
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_tiers_insert_own"
  on public.user_tiers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_tiers_update_own"
  on public.user_tiers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_tiers_delete_own"
  on public.user_tiers
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.cards to authenticated;
grant select, insert, update, delete on table public.scan_events to authenticated;
grant select, insert, update, delete on table public.user_tiers to authenticated;

-- ---------------------------------------------------------------------------
-- Default tier on signup + backfill
-- ---------------------------------------------------------------------------

create or replace function public.assign_default_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tiers (user_id, tier, binder_limit, card_limit)
  values (new.id, 'free', 1, 500)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_assign_default_tier
  after insert on auth.users
  for each row
  execute function public.assign_default_tier();

insert into public.user_tiers (user_id, tier, binder_limit, card_limit)
select u.id, 'free', 1, 500
from auth.users u
where not exists (
  select 1
  from public.user_tiers ut
  where ut.user_id = u.id
);

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
  v_tier text;
  v_binders int;
  v_cards int;
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

  insert into public.user_tiers (user_id, tier, binder_limit, card_limit)
  values (v_uid, v_tier, v_binders, v_cards)
  on conflict (user_id) do update set
    tier = excluded.tier,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    updated_at = now();
end;
$$;

comment on function public.mock_upgrade_user_tier(text) is 'TESTING: sets caller tier row from slug (maps legacy tier slugs to free/pro/elite).';

revoke all on function public.mock_upgrade_user_tier(text) from public;
grant execute on function public.mock_upgrade_user_tier(text) to authenticated;

notify pgrst, 'reload schema';
