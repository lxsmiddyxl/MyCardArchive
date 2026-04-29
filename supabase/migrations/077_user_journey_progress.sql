-- Collector journeys: progress rows, refresh (idempotent), RPC reads, triggers.
-- Thresholds and journey_id values MUST stay aligned with `src/lib/journeys/journey-catalog.ts`.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_journey_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  journey_id text not null,
  completed_steps int not null default 0,
  is_complete boolean not null default false,
  completed_at timestamptz,
  constraint user_journey_progress_user_journey unique (user_id, journey_id)
);

create index if not exists user_journey_progress_user_id_idx
  on public.user_journey_progress (user_id);

comment on table public.user_journey_progress is
  'Metadata-driven collector journey progress; updated by refresh_user_journey_progress (triggers).';

alter table public.user_journey_progress enable row level security;

drop policy if exists "user_journey_progress_select_authenticated" on public.user_journey_progress;
create policy "user_journey_progress_select_authenticated"
  on public.user_journey_progress
  for select
  to authenticated
  using (true);

grant select on table public.user_journey_progress to authenticated;

-- ---------------------------------------------------------------------------
-- Internal: merge one journey row + optional first-completion badge (journey type)
-- ---------------------------------------------------------------------------

create or replace function public._journey_merge_progress(
  p_user_id uuid,
  p_journey_id text,
  p_steps int,
  p_complete boolean,
  p_badge_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  if p_user_id is null or p_journey_id is null or length(trim(p_journey_id)) = 0 then
    return;
  end if;

  select ujp.is_complete into v_old
  from public.user_journey_progress ujp
  where ujp.user_id = p_user_id
    and ujp.journey_id = trim(p_journey_id);

  insert into public.user_journey_progress (id, user_id, journey_id, completed_steps, is_complete, completed_at)
  values (
    gen_random_uuid(),
    p_user_id,
    trim(p_journey_id),
    greatest(0, p_steps),
    p_complete,
    case when p_complete then now() else null end
  )
  on conflict (user_id, journey_id) do update set
    completed_steps = excluded.completed_steps,
    is_complete = excluded.is_complete,
    completed_at = coalesce(public.user_journey_progress.completed_at, excluded.completed_at);

  if p_complete and coalesce(v_old, false) = false and p_badge_key is not null and length(trim(p_badge_key)) > 0 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'journey', trim(p_badge_key), now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public._journey_merge_progress(uuid, text, int, boolean, text) from public;

-- ---------------------------------------------------------------------------
-- refresh_user_journey_progress: recompute all catalog journeys from live data
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_journey_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scan int;
  v_binders int;
  v_sets int;
  v_streak int;
  v_rep bigint;
  v_has_seasonal boolean;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(count(*)::int, 0) into v_scan
  from public.scan_events
  where user_id = p_user_id;

  select coalesce(count(*)::int, 0) into v_binders
  from public.binders
  where user_id = p_user_id;

  select coalesce(count(distinct cc.set_id)::int, 0) into v_sets
  from public.cards c
  inner join public.catalog_cards cc on cc.id = c.catalog_card_id
  where c.user_id = p_user_id
    and c.catalog_card_id is not null;

  select coalesce(max(s.streak_count), 0) into v_streak
  from public.user_activity_streaks s
  where s.user_id = p_user_id;

  select coalesce(max(rc.score), 0)::bigint into v_rep
  from public.user_reputation_cache rc
  where rc.user_id = p_user_id;

  if v_rep is null then
    v_rep := 0;
  end if;

  select exists (
    select 1
    from public.user_badges b
    where b.user_id = p_user_id
      and b.badge_type = 'seasonal_event'
  ) into v_has_seasonal;

  perform public._journey_merge_progress(
    p_user_id,
    'first_50_scans',
    least(v_scan, 50),
    v_scan >= 50,
    'journey_scan_50'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_500_scans',
    least(v_scan, 500),
    v_scan >= 500,
    'journey_scan_500'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_binder_complete',
    case when v_binders >= 1 then 1 else 0 end,
    v_binders >= 1,
    'journey_first_binder'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'ten_unique_sets',
    least(v_sets, 10),
    v_sets >= 10,
    'journey_ten_sets'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'seven_day_streak',
    least(v_streak, 7),
    v_streak >= 7,
    null
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_seasonal_badge',
    case when v_has_seasonal then 1 else 0 end,
    v_has_seasonal,
    'journey_first_seasonal'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'thousand_reputation',
    case when v_rep >= 1000 then 1 else 0 end,
    v_rep >= 1000,
    'journey_rep_1000'
  );
end;
$$;

revoke all on function public.refresh_user_journey_progress(uuid) from public;

-- ---------------------------------------------------------------------------
-- RPC: read progress for one user
-- ---------------------------------------------------------------------------

create or replace function public.get_user_journey_progress(p_user_id uuid)
returns table (
  journey_id text,
  completed_steps int,
  is_complete boolean,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ujp.journey_id,
    ujp.completed_steps,
    ujp.is_complete,
    ujp.completed_at
  from public.user_journey_progress ujp
  where ujp.user_id = p_user_id
  order by ujp.journey_id asc;
$$;

revoke all on function public.get_user_journey_progress(uuid) from public;
grant execute on function public.get_user_journey_progress(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: batch read for feed / community enrichment
-- ---------------------------------------------------------------------------

create or replace function public.get_users_journey_progress_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  journey_id text,
  completed_steps int,
  is_complete boolean,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ujp.user_id,
    ujp.journey_id,
    ujp.completed_steps,
    ujp.is_complete,
    ujp.completed_at
  from public.user_journey_progress ujp
  where ujp.user_id = any(p_user_ids);
$$;

revoke all on function public.get_users_journey_progress_batch(uuid[]) from public;
grant execute on function public.get_users_journey_progress_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: upsert row only (no badge grants) — service / migrations; not for clients
-- ---------------------------------------------------------------------------

create or replace function public.upsert_user_journey_progress(
  p_user_id uuid,
  p_journey_id text,
  p_completed_steps int,
  p_is_complete boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_journey_id is null or length(trim(p_journey_id)) = 0 then
    return;
  end if;

  insert into public.user_journey_progress (id, user_id, journey_id, completed_steps, is_complete, completed_at)
  values (
    gen_random_uuid(),
    p_user_id,
    trim(p_journey_id),
    greatest(0, p_completed_steps),
    p_is_complete,
    case when p_is_complete then now() else null end
  )
  on conflict (user_id, journey_id) do update set
    completed_steps = excluded.completed_steps,
    is_complete = excluded.is_complete,
    completed_at = coalesce(public.user_journey_progress.completed_at, excluded.completed_at);
end;
$$;

revoke all on function public.upsert_user_journey_progress(uuid, text, int, boolean) from public;
grant execute on function public.upsert_user_journey_progress(uuid, text, int, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Triggers: refresh on relevant writes
-- ---------------------------------------------------------------------------

create or replace function public.trg_journey_refresh_from_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_journey_progress(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_journey_refresh_from_user_id() from public;

create or replace function public.trg_journey_refresh_reputation_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_journey_progress(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_journey_refresh_reputation_owner() from public;

create or replace function public.trg_journey_refresh_streak_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_journey_progress(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_journey_refresh_streak_owner() from public;

create or replace function public.trg_journey_refresh_on_seasonal_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.badge_type = 'seasonal_event' and new.user_id is not null then
    perform public.refresh_user_journey_progress(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_journey_refresh_on_seasonal_badge() from public;

drop trigger if exists user_journey_scan_events_ai on public.scan_events;
create trigger user_journey_scan_events_ai
  after insert on public.scan_events
  for each row
  execute function public.trg_journey_refresh_from_user_id();

drop trigger if exists user_journey_binders_ai on public.binders;
create trigger user_journey_binders_ai
  after insert on public.binders
  for each row
  execute function public.trg_journey_refresh_from_user_id();

drop trigger if exists user_journey_cards_ai on public.cards;
create trigger user_journey_cards_ai
  after insert on public.cards
  for each row
  execute function public.trg_journey_refresh_from_user_id();

drop trigger if exists user_journey_reputation_aiu on public.user_reputation_cache;
create trigger user_journey_reputation_aiu
  after insert or update of score on public.user_reputation_cache
  for each row
  execute function public.trg_journey_refresh_reputation_owner();

drop trigger if exists user_journey_streaks_aiu on public.user_activity_streaks;
create trigger user_journey_streaks_aiu
  after insert or update of streak_count on public.user_activity_streaks
  for each row
  execute function public.trg_journey_refresh_streak_owner();

drop trigger if exists user_journey_badges_seasonal_ai on public.user_badges;
create trigger user_journey_badges_seasonal_ai
  after insert on public.user_badges
  for each row
  execute function public.trg_journey_refresh_on_seasonal_badge();

-- ---------------------------------------------------------------------------
-- Badge ordering: journey after seasonal
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
      when 'journey' then 4
      else 5
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
      when 'journey' then
        case b.badge_key
          when 'journey_rep_1000' then 7
          when 'journey_first_seasonal' then 6
          when 'journey_ten_sets' then 5
          when 'journey_first_binder' then 4
          when 'journey_scan_500' then 3
          when 'journey_scan_50' then 2
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
