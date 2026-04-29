-- Seasonal limited badges: participation log + RPC + auto-award triggers.
-- Date windows MUST match `src/lib/events/seasonal-events.ts` (UTC, exclusive end).

create table if not exists public.seasonal_event_participation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id text not null,
  earned_at timestamptz not null default now(),
  constraint seasonal_event_participation_user_event unique (user_id, event_id)
);

create index if not exists seasonal_event_participation_user_idx
  on public.seasonal_event_participation (user_id);

comment on table public.seasonal_event_participation is
  'One row per user per seasonal campaign when badge is granted.';

alter table public.seasonal_event_participation enable row level security;

drop policy if exists "seasonal_event_participation_select_authenticated" on public.seasonal_event_participation;
create policy "seasonal_event_participation_select_authenticated"
  on public.seasonal_event_participation
  for select
  to authenticated
  using (true);

grant select on table public.seasonal_event_participation to authenticated;

-- ---------------------------------------------------------------------------
-- record_seasonal_event_participation: window check + participation + badge
-- (internal; not granted to authenticated — triggers + definer chain only)
-- ---------------------------------------------------------------------------

create or replace function public.record_seasonal_event_participation(
  p_user_id uuid,
  p_event_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end_excl timestamptz;
  v_badge text;
  v_ins uuid;
begin
  if p_user_id is null or p_event_id is null or length(trim(p_event_id)) = 0 then
    return;
  end if;

  case trim(p_event_id)
    when 'spring_2026' then
      v_start := timestamptz '2026-03-01T00:00:00+00';
      v_end_excl := timestamptz '2026-06-01T00:00:00+00';
      v_badge := 'spring_2026_collector';
    when 'summer_scan_2026' then
      v_start := timestamptz '2026-06-01T00:00:00+00';
      v_end_excl := timestamptz '2026-09-01T00:00:00+00';
      v_badge := 'summer_2026_scan_sprint';
    when 'holiday_2026' then
      v_start := timestamptz '2026-12-01T00:00:00+00';
      v_end_excl := timestamptz '2027-01-08T00:00:00+00';
      v_badge := 'holiday_2026_collector';
    else
      return;
  end case;

  if timezone('utc', now()) < v_start or timezone('utc', now()) >= v_end_excl then
    return;
  end if;

  insert into public.seasonal_event_participation (user_id, event_id)
  values (p_user_id, trim(p_event_id))
  on conflict (user_id, event_id) do nothing
  returning id into v_ins;

  if v_ins is null then
    return;
  end if;

  insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
  values (p_user_id, 'seasonal_event', v_badge, now())
  on conflict (user_id, badge_type, badge_key) do nothing;
end;
$$;

revoke all on function public.record_seasonal_event_participation(uuid, text) from public;
grant execute on function public.record_seasonal_event_participation(uuid, text) to service_role;

create or replace function public.try_award_seasonal_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  perform public.record_seasonal_event_participation(p_user_id, 'spring_2026');
  perform public.record_seasonal_event_participation(p_user_id, 'summer_scan_2026');
  perform public.record_seasonal_event_participation(p_user_id, 'holiday_2026');
end;
$$;

revoke all on function public.try_award_seasonal_for_user(uuid) from public;

-- ---------------------------------------------------------------------------
-- Batch read for API enrichment
-- ---------------------------------------------------------------------------

create or replace function public.get_users_seasonal_event_context(p_user_ids uuid[])
returns table (
  user_id uuid,
  top_seasonal_badge_key text,
  seasonal_badge_keys text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid as user_id,
    (
      select b.badge_key
      from public.user_badges b
      where b.user_id = u.uid
        and b.badge_type = 'seasonal_event'
      order by
        case b.badge_key
          when 'holiday_2026_collector' then 3
          when 'summer_2026_scan_sprint' then 2
          when 'spring_2026_collector' then 1
          else 0
        end desc
      limit 1
    ) as top_seasonal_badge_key,
    coalesce(
      (
        select array_agg(distinct b2.badge_key order by
          case b2.badge_key
            when 'holiday_2026_collector' then 3
            when 'summer_2026_scan_sprint' then 2
            when 'spring_2026_collector' then 1
            else 0
          end desc
        )
        from public.user_badges b2
        where b2.user_id = u.uid
          and b2.badge_type = 'seasonal_event'
      ),
      array[]::text[]
    ) as seasonal_badge_keys
  from unnest(p_user_ids) as u(uid);
$$;

revoke all on function public.get_users_seasonal_event_context(uuid[]) from public;
grant execute on function public.get_users_seasonal_event_context(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace get_user_badges ordering: tier, tenure, milestones, seasonal, rest
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
      when 'seasonal_event' then 3
      else 4
    end,
    case b.badge_type
      when 'scan_milestone' then
        case b.badge_key
          when 'scans_5000' then 5000
          when 'scans_1000' then 1000
          when 'scans_500' then 500
          when 'scans_100' then 100
          else 0
        end
      when 'seasonal_event' then
        case b.badge_key
          when 'holiday_2026_collector' then 3
          when 'summer_2026_scan_sprint' then 2
          when 'spring_2026_collector' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row trigger helper (must exist before CREATE TRIGGER)
-- ---------------------------------------------------------------------------

create or replace function public.try_award_seasonal_for_user_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if tg_table_name = 'scan_events' then
    uid := new.user_id;
  elsif tg_table_name = 'community_posts' then
    uid := new.author_id;
  elsif tg_table_name = 'community_post_comments' then
    uid := new.author_id;
  elsif tg_table_name = 'community_post_likes' then
    uid := new.user_id;
  else
    return new;
  end if;
  if uid is not null then
    perform public.try_award_seasonal_for_user(uid);
  end if;
  return new;
end;
$$;

revoke all on function public.try_award_seasonal_for_user_trigger() from public;

-- ---------------------------------------------------------------------------
-- Auto-award triggers (scan, post, comment, like)
-- ---------------------------------------------------------------------------

drop trigger if exists seasonal_try_award_scan_events_ai on public.scan_events;
create trigger seasonal_try_award_scan_events_ai
  after insert on public.scan_events
  for each row
  execute function public.try_award_seasonal_for_user_trigger();

drop trigger if exists seasonal_try_award_community_posts_ai on public.community_posts;
create trigger seasonal_try_award_community_posts_ai
  after insert on public.community_posts
  for each row
  execute function public.try_award_seasonal_for_user_trigger();

drop trigger if exists seasonal_try_award_comments_ai on public.community_post_comments;
create trigger seasonal_try_award_comments_ai
  after insert on public.community_post_comments
  for each row
  execute function public.try_award_seasonal_for_user_trigger();

drop trigger if exists seasonal_try_award_likes_ai on public.community_post_likes;
create trigger seasonal_try_award_likes_ai
  after insert on public.community_post_likes
  for each row
  execute function public.try_award_seasonal_for_user_trigger();

notify pgrst, 'reload schema';
