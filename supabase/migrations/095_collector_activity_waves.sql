-- Phase 27: Platform-wide qualitative activity waves (aggregates only — no per-user exposure).
-- day_bucket: ISO weekday 1 (Monday) … 7 (Sunday). hour_bucket: 0–23 UTC.

-- ---------------------------------------------------------------------------
-- Meta (refresh coordination — Supabase cron / app POST every ~15m)
-- ---------------------------------------------------------------------------

create table if not exists public.collector_activity_wave_meta (
  id smallint primary key default 1 constraint collector_activity_wave_meta_singleton check (id = 1),
  last_refresh_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.collector_activity_wave_meta (id, last_refresh_at)
values (1, now())
on conflict (id) do nothing;

alter table public.collector_activity_wave_meta enable row level security;
revoke all on public.collector_activity_wave_meta from public;
drop policy if exists collector_activity_wave_meta_select on public.collector_activity_wave_meta;
create policy collector_activity_wave_meta_select
  on public.collector_activity_wave_meta for select to authenticated using (true);
grant select on public.collector_activity_wave_meta to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate tables (counts are internal; RPCs expose bands only)
-- ---------------------------------------------------------------------------

create table if not exists public.collector_activity_wave (
  day_bucket smallint not null check (day_bucket between 1 and 7),
  hour_bucket smallint not null check (hour_bucket between 0 and 23),
  active_collectors bigint not null default 0,
  active_sets bigint not null default 0,
  active_clubs bigint not null default 0,
  wave_band text not null check (
    wave_band in ('very_active', 'active', 'steady', 'quiet', 'sleeping')
  ),
  primary key (day_bucket, hour_bucket)
);

create index if not exists collector_activity_wave_band_idx
  on public.collector_activity_wave (wave_band);

create table if not exists public.set_activity_wave (
  set_id text not null references public.catalog_sets (id) on delete cascade,
  day_bucket smallint not null check (day_bucket between 1 and 7),
  hour_bucket smallint not null check (hour_bucket between 0 and 23),
  active_collectors bigint not null default 0,
  wave_band text not null check (
    wave_band in ('very_active', 'active', 'steady', 'quiet', 'sleeping')
  ),
  primary key (set_id, day_bucket, hour_bucket)
);

create index if not exists set_activity_wave_set_idx on public.set_activity_wave (set_id);

create table if not exists public.club_activity_wave (
  club_id text not null,
  day_bucket smallint not null check (day_bucket between 1 and 7),
  hour_bucket smallint not null check (hour_bucket between 0 and 23),
  active_collectors bigint not null default 0,
  wave_band text not null check (
    wave_band in ('very_active', 'active', 'steady', 'quiet', 'sleeping')
  ),
  primary key (club_id, day_bucket, hour_bucket)
);

create table if not exists public.seasonal_activity_wave (
  season_id text not null,
  day_bucket smallint not null check (day_bucket between 1 and 7),
  hour_bucket smallint not null check (hour_bucket between 0 and 23),
  active_collectors bigint not null default 0,
  wave_band text not null check (
    wave_band in ('very_active', 'active', 'steady', 'quiet', 'sleeping')
  ),
  primary key (season_id, day_bucket, hour_bucket)
);

comment on table public.collector_activity_wave is
  'Rolling coarse platform rhythm — derived from presence, scans, community, rooms; refreshed periodically.';
comment on table public.set_activity_wave is
  'Per-set scan/catalog-derived aggregates — no user identifiers exposed downstream.';

alter table public.collector_activity_wave enable row level security;
alter table public.set_activity_wave enable row level security;
alter table public.club_activity_wave enable row level security;
alter table public.seasonal_activity_wave enable row level security;

drop policy if exists collector_activity_wave_select_authenticated on public.collector_activity_wave;
create policy collector_activity_wave_select_authenticated
  on public.collector_activity_wave for select to authenticated using (true);

drop policy if exists set_activity_wave_select_authenticated on public.set_activity_wave;
create policy set_activity_wave_select_authenticated
  on public.set_activity_wave for select to authenticated using (true);

drop policy if exists club_activity_wave_select_authenticated on public.club_activity_wave;
create policy club_activity_wave_select_authenticated
  on public.club_activity_wave for select to authenticated using (true);

drop policy if exists seasonal_activity_wave_select_authenticated on public.seasonal_activity_wave;
create policy seasonal_activity_wave_select_authenticated
  on public.seasonal_activity_wave for select to authenticated using (true);

grant select on public.collector_activity_wave to authenticated;
grant select on public.set_activity_wave to authenticated;
grant select on public.club_activity_wave to authenticated;
grant select on public.seasonal_activity_wave to authenticated;

-- ---------------------------------------------------------------------------
-- Band helpers — deterministic tiers (privacy-preserving; no user linkage)
-- ---------------------------------------------------------------------------

create or replace function public.activity_count_to_wave_band(p_count bigint)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_count, 0) <= 0 then 'sleeping'
    when p_count <= 2 then 'quiet'
    when p_count <= 7 then 'steady'
    when p_count <= 18 then 'active'
    else 'very_active'
  end::text;
$$;

create or replace function public.activity_ntile_band(p_ntile int)
returns text
language sql
immutable
as $$
  select case p_ntile
    when 1 then 'sleeping'
    when 2 then 'quiet'
    when 3 then 'steady'
    when 4 then 'active'
    else 'very_active'
  end::text;
$$;

-- ---------------------------------------------------------------------------
-- refresh_activity_waves — SECURITY DEFINER; invoked by service_role / cron / API
-- ---------------------------------------------------------------------------

create or replace function public.refresh_activity_waves()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '21 days';
begin
  truncate public.collector_activity_wave restart identity;
  truncate public.set_activity_wave restart identity;
  truncate public.club_activity_wave restart identity;
  truncate public.seasonal_activity_wave restart identity;

  -- Platform collectors — union activity fingerprints (distinct users per UTC hour slot).
  with unioned as (
    select date_trunc('hour', last_seen_at) as hr, user_id
    from public.user_presence
    where last_seen_at >= v_since
      and coalesce(presence_opt_out, false) = false
    union all
    select date_trunc('hour', created_at), user_id
    from public.scan_events
    where created_at >= v_since
    union all
    select date_trunc('hour', created_at), author_id
    from public.community_posts
    where created_at >= v_since
    union all
    select date_trunc('hour', created_at), author_id
    from public.community_post_comments
    where created_at >= v_since
    union all
    select date_trunc('hour', crm.last_seen_at), crm.user_id
    from public.collector_room_members crm
    where crm.last_seen_at >= v_since
  ),
  bucketed as (
    select
      extract(isodow from hr)::int as day_bucket,
      extract(hour from hr)::int as hour_bucket,
      user_id
    from unioned
    where hr is not null
  ),
  agg as (
    select day_bucket, hour_bucket, count(distinct user_id)::bigint as active_collectors
    from bucketed
    group by 1, 2
  ),
  filled as (
    select d.d as day_bucket, h.h as hour_bucket, coalesce(a.active_collectors, 0)::bigint as active_collectors
    from generate_series(1, 7) as d(d)
    cross join generate_series(0, 23) as h(h)
    left join agg a
      on a.day_bucket = d.d and a.hour_bucket = h.h
  ),
  set_counts as (
    select
      extract(isodow from date_trunc('hour', se.created_at))::int as day_bucket,
      extract(hour from date_trunc('hour', se.created_at))::int as hour_bucket,
      cc.set_id::text as set_id
    from public.scan_events se
    inner join public.cards c on c.id = se.card_id
    inner join public.catalog_cards cc on cc.id = c.catalog_card_id
    where se.created_at >= v_since
      and c.catalog_card_id is not null
  ),
  set_agg as (
    select day_bucket, hour_bucket, count(distinct set_id)::bigint as active_sets
    from set_counts
    group by 1, 2
  ),
  club_counts as (
    select
      extract(isodow from date_trunc('hour', crm.last_seen_at))::int as day_bucket,
      extract(hour from date_trunc('hour', crm.last_seen_at))::int as hour_bucket,
      cr.topic_key as club_id
    from public.collector_room_members crm
    inner join public.collector_rooms cr on cr.room_id = crm.room_id
    where cr.room_type = 'club_room'
      and cr.topic_key is not null
      and crm.last_seen_at >= v_since
  ),
  club_agg as (
    select day_bucket, hour_bucket, count(distinct club_id)::bigint as active_clubs
    from club_counts
    group by 1, 2
  ),
  merged as (
    select
      f.day_bucket,
      f.hour_bucket,
      f.active_collectors,
      coalesce(sa.active_sets, 0)::bigint as active_sets,
      coalesce(ca.active_clubs, 0)::bigint as active_clubs
    from filled f
    left join set_agg sa on sa.day_bucket = f.day_bucket and sa.hour_bucket = f.hour_bucket
    left join club_agg ca on ca.day_bucket = f.day_bucket and ca.hour_bucket = f.hour_bucket
  ),
  ranked as (
    select
      m.*,
      ntile(5) over (order by m.active_collectors) as q_collectors
    from merged m
  )
  insert into public.collector_activity_wave (
    day_bucket, hour_bucket, active_collectors, active_sets, active_clubs, wave_band
  )
  select
    r.day_bucket,
    r.hour_bucket,
    r.active_collectors,
    r.active_sets,
    r.active_clubs,
    public.activity_ntile_band(r.q_collectors)::text
  from ranked r;

  -- Per-set waves (scan-derived collectors per bucket).
  with scan_bucket as (
    select
      cc.set_id::text as set_id,
      extract(isodow from date_trunc('hour', se.created_at))::int as day_bucket,
      extract(hour from date_trunc('hour', se.created_at))::int as hour_bucket,
      se.user_id
    from public.scan_events se
    inner join public.cards c on c.id = se.card_id
    inner join public.catalog_cards cc on cc.id = c.catalog_card_id
    where se.created_at >= v_since
      and c.catalog_card_id is not null
  ),
  agg as (
    select set_id, day_bucket, hour_bucket, count(distinct user_id)::bigint as active_collectors
    from scan_bucket
    group by 1, 2, 3
  ),
  ranked as (
    select
      a.*,
      ntile(5) over (partition by a.set_id order by a.active_collectors) as q
    from agg a
  )
  insert into public.set_activity_wave (set_id, day_bucket, hour_bucket, active_collectors, wave_band)
  select set_id, day_bucket, hour_bucket, active_collectors, public.activity_ntile_band(q)::text
  from ranked;

  -- Club arcs — ephemeral club rooms.
  with club_bucket as (
    select
      cr.topic_key as club_id,
      extract(isodow from date_trunc('hour', crm.last_seen_at))::int as day_bucket,
      extract(hour from date_trunc('hour', crm.last_seen_at))::int as hour_bucket,
      crm.user_id
    from public.collector_room_members crm
    inner join public.collector_rooms cr on cr.room_id = crm.room_id
    where cr.room_type = 'club_room'
      and cr.topic_key is not null
      and crm.last_seen_at >= v_since
  ),
  agg as (
    select club_id, day_bucket, hour_bucket, count(distinct user_id)::bigint as active_collectors
    from club_bucket
    group by 1, 2, 3
  ),
  ranked as (
    select
      a.*,
      ntile(5) over (partition by a.club_id order by a.active_collectors) as q
    from agg a
  )
  insert into public.club_activity_wave (club_id, day_bucket, hour_bucket, active_collectors, wave_band)
  select club_id, day_bucket, hour_bucket, active_collectors, public.activity_ntile_band(q)::text
  from ranked;

  -- Seasonal participation timestamps (earned badges — coarse pulse).
  with sea as (
    select
      sep.event_id as season_id,
      extract(isodow from date_trunc('hour', sep.earned_at))::int as day_bucket,
      extract(hour from date_trunc('hour', sep.earned_at))::int as hour_bucket,
      sep.user_id
    from public.seasonal_event_participation sep
    where sep.earned_at >= v_since
  ),
  agg as (
    select season_id, day_bucket, hour_bucket, count(distinct user_id)::bigint as active_collectors
    from sea
    group by 1, 2, 3
  ),
  ranked as (
    select
      a.*,
      ntile(5) over (partition by a.season_id order by a.active_collectors) as q
    from agg a
  )
  insert into public.seasonal_activity_wave (season_id, day_bucket, hour_bucket, active_collectors, wave_band)
  select season_id, day_bucket, hour_bucket, active_collectors, public.activity_ntile_band(q)::text
  from ranked;

  insert into public.collector_activity_wave_meta (id, last_refresh_at, updated_at)
  values (1, now(), now())
  on conflict (id) do update
  set last_refresh_at = excluded.last_refresh_at, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_activity_waves() from public;
grant execute on function public.refresh_activity_waves() to service_role;
-- Fallback when service_role key is absent locally — aggregates only (still bounded work).
grant execute on function public.refresh_activity_waves() to authenticated;

-- ---------------------------------------------------------------------------
-- Read RPCs — qualitative exposure only (counts omitted from returns)
-- ---------------------------------------------------------------------------

create or replace function public.get_platform_activity_wave()
returns table (
  day_bucket smallint,
  hour_bucket smallint,
  wave_band text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.day_bucket, c.hour_bucket, c.wave_band
  from public.collector_activity_wave c
  order by c.day_bucket, c.hour_bucket;
$$;

revoke all on function public.get_platform_activity_wave() from public;
grant execute on function public.get_platform_activity_wave() to authenticated;

create or replace function public.get_set_activity_wave(p_set_id text)
returns table (
  hour_bucket smallint,
  wave_band text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.h::smallint as hour_bucket,
         public.activity_count_to_wave_band(sum(s.active_collectors))::text as wave_band
  from generate_series(0, 23) as h(h)
  left join public.set_activity_wave s
    on s.set_id = trim(p_set_id)
   and s.hour_bucket = h.h::int
  group by h.h
  order by h.h;
$$;

revoke all on function public.get_set_activity_wave(text) from public;
grant execute on function public.get_set_activity_wave(text) to authenticated;

create or replace function public.get_club_activity_wave(p_club_id text)
returns table (
  hour_bucket smallint,
  wave_band text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.h::smallint as hour_bucket,
         public.activity_count_to_wave_band(sum(c.active_collectors))::text as wave_band
  from generate_series(0, 23) as h(h)
  left join public.club_activity_wave c
    on c.club_id = trim(p_club_id)
   and c.hour_bucket = h.h::int
  group by h.h
  order by h.h;
$$;

revoke all on function public.get_club_activity_wave(text) from public;
grant execute on function public.get_club_activity_wave(text) to authenticated;

create or replace function public.get_seasonal_activity_wave(p_season_id text)
returns table (
  hour_bucket smallint,
  wave_band text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.h::smallint as hour_bucket,
         public.activity_count_to_wave_band(sum(s.active_collectors))::text as wave_band
  from generate_series(0, 23) as h(h)
  left join public.seasonal_activity_wave s
    on s.season_id = trim(p_season_id)
   and s.hour_bucket = h.h::int
  group by h.h
  order by h.h;
$$;

revoke all on function public.get_seasonal_activity_wave(text) from public;
grant execute on function public.get_seasonal_activity_wave(text) to authenticated;

create or replace function public.get_activity_spotlights(p_limit integer)
returns table (
  note text
)
language sql
volatile
security definer
set search_path = public
as $$
  select case (floor(random() * 5))::int
    when 0 then 'Evenings lean lively — scans and binders hum together.'
    when 1 then 'Midweek pockets stay steady — community ripples without rush.'
    when 2 then 'Quiet corners still belong — the hobby breathes at every pace.'
    when 3 then 'Seasonal pulses sometimes spike — collector energy clusters softly.'
    else 'Late hours soften — fewer sparks, same welcoming hobby rhythm.'
  end::text as note
  from generate_series(1, greatest(1, least(coalesce(p_limit, 6), 16)));
$$;

revoke all on function public.get_activity_spotlights(integer) from public;
grant execute on function public.get_activity_spotlights(integer) to authenticated;

notify pgrst, 'reload schema';
