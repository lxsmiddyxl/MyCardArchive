-- Tier / tenure / scan-milestone badges for social identity (read-heavy; grants via triggers).

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_type text not null,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  constraint user_badges_type_key_unique unique (user_id, badge_type, badge_key)
);

create index if not exists user_badges_user_id_idx on public.user_badges (user_id);
create index if not exists user_badges_user_type_idx on public.user_badges (user_id, badge_type);

comment on table public.user_badges is
  'Earned badges: tier (current plan), tenure (member since year), scan_milestone thresholds.';

alter table public.user_badges enable row level security;

drop policy if exists "user_badges_select_authenticated" on public.user_badges;
create policy "user_badges_select_authenticated"
  on public.user_badges
  for select
  to authenticated
  using (true);

grant select on table public.user_badges to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: all badges for a profile (ordered: tier, tenure, milestones desc)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_badges(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  badge_type text,
  badge_key text,
  earned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.user_id, b.badge_type, b.badge_key, b.earned_at
  from public.user_badges b
  where b.user_id = p_user_id
  order by
    case b.badge_type
      when 'tier' then 0
      when 'tenure' then 1
      when 'scan_milestone' then 2
      else 3
    end,
    case b.badge_key
      when 'scans_5000' then 5000
      when 'scans_1000' then 1000
      when 'scans_500' then 500
      when 'scans_100' then 100
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: highest scan milestone badge per user (for feed / comments inline UI)
-- ---------------------------------------------------------------------------

create or replace function public.get_users_top_scan_milestones(p_user_ids uuid[])
returns table (
  user_id uuid,
  badge_key text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (b.user_id)
    b.user_id,
    b.badge_key
  from public.user_badges b
  where b.user_id = any(p_user_ids)
    and b.badge_type = 'scan_milestone'
  order by
    b.user_id,
    case b.badge_key
      when 'scans_5000' then 5000
      when 'scans_1000' then 1000
      when 'scans_500' then 500
      when 'scans_100' then 100
      else 0
    end desc;
$$;

revoke all on function public.get_users_top_scan_milestones(uuid[]) from public;
grant execute on function public.get_users_top_scan_milestones(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: scan milestones (exact thresholds, post-insert count)
-- ---------------------------------------------------------------------------

create or replace function public.user_badges_after_scan_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c bigint;
begin
  select count(*)::bigint into c
  from public.scan_events
  where user_id = new.user_id;

  if c >= 5000 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (new.user_id, 'scan_milestone', 'scans_5000', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if c >= 1000 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (new.user_id, 'scan_milestone', 'scans_1000', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if c >= 500 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (new.user_id, 'scan_milestone', 'scans_500', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
  if c >= 100 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (new.user_id, 'scan_milestone', 'scans_100', now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists user_badges_scan_events_after_insert on public.scan_events;
create trigger user_badges_scan_events_after_insert
  after insert on public.scan_events
  for each row
  execute function public.user_badges_after_scan_insert();

-- ---------------------------------------------------------------------------
-- Trigger: single current tier badge (replace on tier change)
-- ---------------------------------------------------------------------------

create or replace function public.user_badges_after_user_tiers_tier_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text := lower(trim(new.tier_slug));
begin
  delete from public.user_badges
  where user_id = new.user_id
    and badge_type = 'tier';

  insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
  values (new.user_id, 'tier', slug, now());

  return new;
end;
$$;

drop trigger if exists user_badges_user_tiers_after_write on public.user_tiers;
create trigger user_badges_user_tiers_after_write
  after insert or update of tier_slug on public.user_tiers
  for each row
  execute function public.user_badges_after_user_tiers_tier_change();

-- ---------------------------------------------------------------------------
-- Trigger: tenure badge from profiles.joined_at (idempotent key per year)
-- ---------------------------------------------------------------------------

create or replace function public.user_badges_after_profile_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y text;
begin
  if new.joined_at is null then
    return new;
  end if;

  y := to_char(new.joined_at at time zone 'UTC', 'YYYY');

  insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
  values (new.id, 'tenure', 'member_since_' || y, new.joined_at)
  on conflict (user_id, badge_type, badge_key) do nothing;

  return new;
end;
$$;

drop trigger if exists user_badges_profiles_after_insert on public.profiles;
create trigger user_badges_profiles_after_insert
  after insert on public.profiles
  for each row
  execute function public.user_badges_after_profile_joined();

drop trigger if exists user_badges_profiles_after_joined_update on public.profiles;
create trigger user_badges_profiles_after_joined_update
  after update of joined_at on public.profiles
  for each row
  when (new.joined_at is not null and (old.joined_at is distinct from new.joined_at))
  execute function public.user_badges_after_profile_joined();

-- ---------------------------------------------------------------------------
-- Backfill (idempotent)
-- ---------------------------------------------------------------------------

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select ut.user_id, 'tier', lower(trim(ut.tier_slug)), coalesce(ut.updated_at, now())
from public.user_tiers ut
on conflict (user_id, badge_type, badge_key) do nothing;

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select
  p.id,
  'tenure',
  'member_since_' || to_char(p.joined_at at time zone 'UTC', 'YYYY'),
  p.joined_at
from public.profiles p
where p.joined_at is not null
on conflict (user_id, badge_type, badge_key) do nothing;

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select s.user_id, 'scan_milestone', 'scans_100', now()
from (
  select user_id, count(*)::bigint as c
  from public.scan_events
  group by user_id
) s
where s.c >= 100
on conflict (user_id, badge_type, badge_key) do nothing;

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select s.user_id, 'scan_milestone', 'scans_500', now()
from (
  select user_id, count(*)::bigint as c
  from public.scan_events
  group by user_id
) s
where s.c >= 500
on conflict (user_id, badge_type, badge_key) do nothing;

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select s.user_id, 'scan_milestone', 'scans_1000', now()
from (
  select user_id, count(*)::bigint as c
  from public.scan_events
  group by user_id
) s
where s.c >= 1000
on conflict (user_id, badge_type, badge_key) do nothing;

insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
select s.user_id, 'scan_milestone', 'scans_5000', now()
from (
  select user_id, count(*)::bigint as c
  from public.scan_events
  group by user_id
) s
where s.c >= 5000
on conflict (user_id, badge_type, badge_key) do nothing;

notify pgrst, 'reload schema';
