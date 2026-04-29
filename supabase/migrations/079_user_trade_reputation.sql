-- Trading-adjacent identity: aggregated trade reputation + private feedback rows.
-- Badges: badge_type = 'trade_reputation'. Flair keys align with `src/lib/trade/trade-reputation-helpers.ts`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_trade_reputation (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  completed_trades_count int not null default 0,
  positive_feedback_count int not null default 0,
  neutral_feedback_count int not null default 0,
  negative_feedback_count int not null default 0,
  last_trade_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.user_trade_reputation is
  'Aggregated trade feedback for a user (recipient); maintained by refresh_user_trade_reputation.';

create table if not exists public.user_trade_feedback (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  rating text not null check (rating in ('positive', 'neutral', 'negative')),
  comment text,
  created_at timestamptz not null default now(),
  constraint user_trade_feedback_no_self check (from_user_id <> to_user_id)
);

create index if not exists user_trade_feedback_to_user_idx on public.user_trade_feedback (to_user_id, created_at desc);
create index if not exists user_trade_feedback_from_user_idx on public.user_trade_feedback (from_user_id, created_at desc);

comment on table public.user_trade_feedback is
  'Per-trade feedback (private); read only via SECURITY DEFINER RPCs — no direct client browsing.';

alter table public.user_trade_reputation enable row level security;
alter table public.user_trade_feedback enable row level security;

-- No SELECT/INSERT policies for authenticated: use RPCs + service_role for writes.
revoke all on table public.user_trade_reputation from public;
revoke all on table public.user_trade_reputation from authenticated;
revoke all on table public.user_trade_reputation from anon;

revoke all on table public.user_trade_feedback from public;
revoke all on table public.user_trade_feedback from authenticated;
revoke all on table public.user_trade_feedback from anon;

grant all on table public.user_trade_reputation to service_role;
grant all on table public.user_trade_feedback to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_trade_reputation: recompute aggregates + award trade_reputation badges
-- Thresholds must match TS helpers in `src/lib/trade/trade-reputation-helpers.ts`.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_trade_reputation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_pos int;
  v_neu int;
  v_neg int;
  v_last timestamptz;
  v_ratio numeric;
  v_tier text;
begin
  if p_user_id is null then
    return;
  end if;

  select
    count(*)::int,
    coalesce(sum(case when f.rating = 'positive' then 1 else 0 end), 0)::int,
    coalesce(sum(case when f.rating = 'neutral' then 1 else 0 end), 0)::int,
    coalesce(sum(case when f.rating = 'negative' then 1 else 0 end), 0)::int,
    max(f.created_at)
  into v_total, v_pos, v_neu, v_neg, v_last
  from public.user_trade_feedback f
  where f.to_user_id = p_user_id;

  if v_total is null then
    v_total := 0;
    v_pos := 0;
    v_neu := 0;
    v_neg := 0;
  end if;

  insert into public.user_trade_reputation (
    user_id,
    completed_trades_count,
    positive_feedback_count,
    neutral_feedback_count,
    negative_feedback_count,
    last_trade_at,
    updated_at
  )
  values (
    p_user_id,
    v_total,
    v_pos,
    v_neu,
    v_neg,
    v_last,
    now()
  )
  on conflict (user_id) do update set
    completed_trades_count = excluded.completed_trades_count,
    positive_feedback_count = excluded.positive_feedback_count,
    neutral_feedback_count = excluded.neutral_feedback_count,
    negative_feedback_count = excluded.negative_feedback_count,
    last_trade_at = excluded.last_trade_at,
    updated_at = excluded.updated_at;

  v_ratio := case when v_total > 0 then v_pos::numeric / v_total::numeric else 0::numeric end;

  select lower(trim(sp.tier_slug)) into v_tier
  from public.social_public_profiles sp
  where sp.user_id = p_user_id
  limit 1;

  if v_total >= 50 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'trade_reputation', 'veteran_trader', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if v_total >= 10 and v_ratio >= 0.85 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'trade_reputation', 'trusted_trader', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(v_tier, '') = 'business' and v_total >= 20 and v_ratio >= 0.90 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'trade_reputation', 'reliable_shop', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_trade_reputation(uuid) from public;
grant execute on function public.refresh_user_trade_reputation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- record_trade_feedback (service_role / future trade flow)
-- ---------------------------------------------------------------------------

create or replace function public.record_trade_feedback(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_rating text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from_user_id is null or p_to_user_id is null or p_from_user_id = p_to_user_id then
    return;
  end if;
  if p_rating is null or p_rating not in ('positive', 'neutral', 'negative') then
    return;
  end if;

  insert into public.user_trade_feedback (from_user_id, to_user_id, rating, comment)
  values (p_from_user_id, p_to_user_id, p_rating, nullif(trim(p_comment), ''));

  perform public.refresh_user_trade_reputation(p_to_user_id);
end;
$$;

revoke all on function public.record_trade_feedback(uuid, uuid, text, text) from public;
grant execute on function public.record_trade_feedback(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Read RPCs (aggregates only)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_trade_reputation(p_user_id uuid)
returns table (
  completed_trades_count int,
  positive_feedback_count int,
  neutral_feedback_count int,
  negative_feedback_count int,
  last_trade_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(r.completed_trades_count, 0)::int,
    coalesce(r.positive_feedback_count, 0)::int,
    coalesce(r.neutral_feedback_count, 0)::int,
    coalesce(r.negative_feedback_count, 0)::int,
    r.last_trade_at
  from (select p_user_id as uid) x
  left join public.user_trade_reputation r on r.user_id = x.uid;
$$;

revoke all on function public.get_user_trade_reputation(uuid) from public;
grant execute on function public.get_user_trade_reputation(uuid) to authenticated;

create or replace function public.get_users_trade_reputation_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  completed_trades_count int,
  positive_feedback_count int,
  neutral_feedback_count int,
  negative_feedback_count int,
  last_trade_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid as user_id,
    coalesce(r.completed_trades_count, 0)::int,
    coalesce(r.positive_feedback_count, 0)::int,
    coalesce(r.neutral_feedback_count, 0)::int,
    coalesce(r.negative_feedback_count, 0)::int,
    r.last_trade_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_trade_reputation r on r.user_id = u.uid;
$$;

revoke all on function public.get_users_trade_reputation_batch(uuid[]) from public;
grant execute on function public.get_users_trade_reputation_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- get_user_badges: trade_reputation after collection_mastery
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
      when 'collection_mastery' then 5
      when 'trade_reputation' then 6
      else 7
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
      when 'collection_mastery' then
        case b.badge_key
          when 'cm_set_ten' then 12
          when 'cm_set_five' then 11
          when 'cm_set_first' then 10
          when 'cm_binder_ten' then 3
          when 'cm_binder_three' then 2
          when 'cm_binder_first' then 1
          else 0
        end
      when 'trade_reputation' then
        case b.badge_key
          when 'reliable_shop' then 3
          when 'veteran_trader' then 2
          when 'trusted_trader' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
