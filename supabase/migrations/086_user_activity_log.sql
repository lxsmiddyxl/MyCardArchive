-- Activity log, heatmap computation, timeline milestones, and triggers (server-side only).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_type text not null,
  activity_date date not null,
  activity_ts timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint user_activity_log_user_type_ts unique (user_id, activity_type, activity_ts),
  constraint user_activity_log_type_check check (
    activity_type in (
      'scan',
      'deck_edit',
      'binder_edit',
      'binder_complete',
      'set_complete',
      'streak_update',
      'seasonal_event',
      'journey_complete',
      'trade_feedback',
      'value_refresh'
    )
  )
);

create index if not exists user_activity_log_user_date_idx
  on public.user_activity_log (user_id, activity_date);

create index if not exists user_activity_log_user_ts_idx
  on public.user_activity_log (user_id, activity_ts desc);

comment on table public.user_activity_log is
  'Append-only activity stream for heatmaps and milestones; written only from server triggers / definer functions.';

alter table public.user_activity_log enable row level security;

drop policy if exists "user_activity_log_no_direct" on public.user_activity_log;
create policy "user_activity_log_no_direct"
  on public.user_activity_log
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on table public.user_activity_log from public;
revoke all on table public.user_activity_log from anon;
revoke all on table public.user_activity_log from authenticated;
grant select, insert, delete, update on table public.user_activity_log to service_role;

-- ---------------------------------------------------------------------------
-- log_user_activity (idempotent via unique constraint)
-- ---------------------------------------------------------------------------

create or replace function public.log_user_activity(
  p_user_id uuid,
  p_type text,
  p_ts timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts timestamptz := coalesce(p_ts, now());
  v_type text := trim(coalesce(p_type, ''));
begin
  if p_user_id is null or length(v_type) = 0 then
    return;
  end if;

  insert into public.user_activity_log (
    id,
    user_id,
    activity_type,
    activity_date,
    activity_ts,
    metadata
  )
  values (
    gen_random_uuid(),
    p_user_id,
    v_type,
    (timezone('utc', v_ts))::date,
    v_ts,
    coalesce(nullif(p_metadata, 'null'::jsonb), '{}'::jsonb)
  )
  on conflict (user_id, activity_type, activity_ts) do nothing;
end;
$$;

revoke all on function public.log_user_activity(uuid, text, timestamptz, jsonb) from public;

-- ---------------------------------------------------------------------------
-- Patch collection mastery merge — log binder/set completion milestones
-- ---------------------------------------------------------------------------

create or replace function public._collection_mastery_merge_row(
  p_user_id uuid,
  p_mastery_type text,
  p_mastery_key text,
  p_completed_count int,
  p_threshold int,
  p_badge_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
  v_complete boolean;
begin
  if p_user_id is null or p_mastery_type is null or length(trim(p_mastery_type)) = 0
     or p_mastery_key is null or length(trim(p_mastery_key)) = 0 or p_threshold is null or p_threshold <= 0 then
    return;
  end if;

  v_complete := p_completed_count >= p_threshold;

  select u.is_complete into v_old
  from public.user_collection_mastery u
  where u.user_id = p_user_id
    and u.mastery_type = trim(p_mastery_type)
    and u.mastery_key = trim(p_mastery_key);

  insert into public.user_collection_mastery (
    id,
    user_id,
    mastery_type,
    mastery_key,
    completed_count,
    is_complete,
    completed_at
  )
  values (
    gen_random_uuid(),
    p_user_id,
    trim(p_mastery_type),
    trim(p_mastery_key),
    greatest(0, p_completed_count),
    v_complete,
    case when v_complete then now() else null end
  )
  on conflict (user_id, mastery_type, mastery_key) do update set
    completed_count = excluded.completed_count,
    is_complete = excluded.is_complete,
    completed_at = coalesce(public.user_collection_mastery.completed_at, excluded.completed_at);

  if v_complete and coalesce(v_old, false) = false then
    perform public.log_user_activity(
      p_user_id,
      case when trim(p_mastery_type) = 'binder' then 'binder_complete' else 'set_complete' end,
      now(),
      jsonb_build_object('masteryKey', trim(p_mastery_key))
    );
  end if;

  if v_complete and coalesce(v_old, false) = false
     and p_badge_key is not null and length(trim(p_badge_key)) > 0 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'collection_mastery', trim(p_badge_key), now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public._collection_mastery_merge_row(uuid, text, text, int, int, text) from public;

-- ---------------------------------------------------------------------------
-- Patch journey merge — log journey completion
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

  if p_complete and coalesce(v_old, false) = false then
    perform public.log_user_activity(
      p_user_id,
      'journey_complete',
      now(),
      jsonb_build_object('journeyId', trim(p_journey_id))
    );
  end if;

  if p_complete and coalesce(v_old, false) = false and p_badge_key is not null and length(trim(p_badge_key)) > 0 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'journey', trim(p_badge_key), now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public._journey_merge_progress(uuid, text, int, boolean, text) from public;

-- ---------------------------------------------------------------------------
-- Heatmap + timeline computation
-- ---------------------------------------------------------------------------

create or replace function public.compute_user_activity_heatmap(p_user_id uuid, p_year int)
returns int[]
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select make_date(p_year, 1, 1) as d0, make_date(p_year, 12, 31) as d1
  ),
  days as (
    select gs::date as d, (gs::date - (select d0 from bounds))::int as idx
    from bounds b,
    lateral generate_series(b.d0, b.d1, interval '1 day') gs
  ),
  agg as (
    select l.activity_date, count(*)::int as c
    from public.user_activity_log l
    cross join bounds b
    where l.user_id = p_user_id
      and l.activity_date between b.d0 and b.d1
    group by l.activity_date
  )
  select coalesce(
    array_agg(coalesce(agg.c, 0) order by days.idx),
    array[]::int[]
  )
  from days
  left join agg on agg.activity_date = days.d;
$$;

revoke all on function public.compute_user_activity_heatmap(uuid, int) from public;

create or replace function public.get_user_activity_heatmap(p_user_id uuid, p_year int)
returns int[]
language sql
stable
security definer
set search_path = public
as $$
  select public.compute_user_activity_heatmap(p_user_id, p_year);
$$;

revoke all on function public.get_user_activity_heatmap(uuid, int) from public;
grant execute on function public.get_user_activity_heatmap(uuid, int) to authenticated;

create or replace function public.get_user_activity_range(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  activity_type text,
  activity_date date,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.activity_type,
    l.activity_date,
    l.metadata
  from public.user_activity_log l
  where l.user_id = p_user_id
    and l.activity_date >= p_start_date
    and l.activity_date <= p_end_date
  order by l.activity_date asc, l.activity_type asc;
$$;

revoke all on function public.get_user_activity_range(uuid, date, date) from public;
grant execute on function public.get_user_activity_range(uuid, date, date) to authenticated;

create or replace function public.compute_user_timeline_events(p_user_id uuid)
returns table (
  event_date date,
  event_type text,
  label text,
  icon text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ts_scan_events timestamptz;
  v_ts_scan_log timestamptz;
  v_scan_day date;
  v_first_binder date;
  v_first_set date;
  v_meta_binder jsonb := '{}'::jsonb;
  v_meta_set jsonb := '{}'::jsonb;
  v_first_season timestamptz;
  v_meta_season jsonb := '{}'::jsonb;
  v_first_journey date;
  v_meta_journey jsonb := '{}'::jsonb;
  v_first_feedback timestamptz;
  v_first_high date;
  v_meta_high jsonb := '{}'::jsonb;
  v_first_streak date;
  v_meta_streak jsonb := '{}'::jsonb;
begin
  if p_user_id is null then
    return;
  end if;

  select min(s.created_at) into v_ts_scan_events
  from public.scan_events s
  where s.user_id = p_user_id;

  select min(l.activity_ts) into v_ts_scan_log
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'scan';

  if v_ts_scan_events is not null and v_ts_scan_log is not null then
    v_scan_day := (timezone('utc', least(v_ts_scan_events, v_ts_scan_log)))::date;
  elsif v_ts_scan_events is not null then
    v_scan_day := (timezone('utc', v_ts_scan_events))::date;
  elsif v_ts_scan_log is not null then
    v_scan_day := (timezone('utc', v_ts_scan_log))::date;
  else
    v_scan_day := null;
  end if;

  select min(l.activity_date) into v_first_binder
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'binder_complete';

  select l.metadata into v_meta_binder
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'binder_complete'
  order by l.activity_ts asc
  limit 1;

  select min(l.activity_date) into v_first_set
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'set_complete';

  select l.metadata into v_meta_set
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'set_complete'
  order by l.activity_ts asc
  limit 1;

  select min(se.earned_at) into v_first_season
  from public.seasonal_event_participation se
  where se.user_id = p_user_id;

  select jsonb_build_object('eventId', se.event_id) into v_meta_season
  from public.seasonal_event_participation se
  where se.user_id = p_user_id
  order by se.earned_at asc
  limit 1;

  select min(l.activity_date) into v_first_journey
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'journey_complete';

  select l.metadata into v_meta_journey
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'journey_complete'
  order by l.activity_ts asc
  limit 1;

  select min(f.created_at) into v_first_feedback
  from public.user_trade_feedback f
  where f.to_user_id = p_user_id;

  select min(l.activity_date) into v_first_high
  from public.user_activity_log l
  where l.user_id = p_user_id
    and l.activity_type = 'value_refresh'
    and l.metadata->>'milestone' = 'high_value_band';

  select l.metadata into v_meta_high
  from public.user_activity_log l
  where l.user_id = p_user_id
    and l.activity_type = 'value_refresh'
    and l.metadata->>'milestone' = 'high_value_band'
  order by l.activity_ts asc
  limit 1;

  select min(l.activity_date) into v_first_streak
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'streak_update';

  select l.metadata into v_meta_streak
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'streak_update'
  order by l.activity_ts asc
  limit 1;

  return query
  select * from (
    select v_scan_day, 'scan'::text, 'First card scan'::text, '📷'::text, '{}'::jsonb
    where v_scan_day is not null
    union all
    select v_first_binder, 'binder_complete', 'First binder milestone', '✅', coalesce(v_meta_binder, '{}'::jsonb)
    where v_first_binder is not null
    union all
    select v_first_set, 'set_complete', 'First set mastered', '🎯', coalesce(v_meta_set, '{}'::jsonb)
    where v_first_set is not null
    union all
    select (timezone('utc', v_first_season))::date, 'seasonal_event', 'Seasonal event participation', '🎊',
      coalesce(v_meta_season, '{}'::jsonb)
    where v_first_season is not null
    union all
    select v_first_journey, 'journey_complete', 'First journey completed', '🧭', coalesce(v_meta_journey, '{}'::jsonb)
    where v_first_journey is not null
    union all
    select (timezone('utc', v_first_feedback))::date, 'trade_feedback', 'First trade feedback received', '🤝',
      jsonb_build_object('kind', 'received')
    where v_first_feedback is not null
    union all
    select v_first_high, 'value_refresh', 'High collection value band', '💎',
      coalesce(v_meta_high, jsonb_build_object('milestone', 'high_value_band'))
    where v_first_high is not null
    union all
    select v_first_streak, 'streak_update', 'Activity streak started', '🔥', coalesce(v_meta_streak, '{}'::jsonb)
    where v_first_streak is not null
  ) x(event_date, event_type, label, icon, metadata)
  order by event_date asc nulls last;
end;
$$;

revoke all on function public.compute_user_timeline_events(uuid) from public;

create or replace function public.get_user_timeline_events(p_user_id uuid)
returns table (
  event_date date,
  event_type text,
  label text,
  icon text,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.event_date,
    e.event_type,
    e.label,
    e.icon,
    e.metadata
  from public.compute_user_timeline_events(p_user_id) e
  where e.event_date >= (timezone('utc', now()))::date - interval '24 months'
  order by e.event_date asc;
$$;

revoke all on function public.get_user_timeline_events(uuid) from public;
grant execute on function public.get_user_timeline_events(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Batching (social strips + feed)
-- ---------------------------------------------------------------------------

create or replace function public.get_users_activity_recent_days_batch(p_user_ids uuid[], p_days int)
returns table (
  user_id uuid,
  counts int[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date := (timezone('utc', now()))::date - (greatest(1, least(coalesce(p_days, 30), 366)) - 1);
  v_end date := (timezone('utc', now()))::date;
  v_len int := v_end - v_start + 1;
  uid uuid;
  arr int[];
  d date;
  i int;
  c int;
begin
  if p_user_ids is null then
    return;
  end if;

  foreach uid in array p_user_ids loop
    arr := array_fill(0, array[v_len]);
    i := 0;
    for d in select generate_series(v_start, v_end, interval '1 day')::date loop
      i := i + 1;
      select count(*)::int into c
      from public.user_activity_log l
      where l.user_id = uid and l.activity_date = d;
      arr[i] := c;
    end loop;
    user_id := uid;
    counts := arr;
    return next;
  end loop;
end;
$$;

revoke all on function public.get_users_activity_recent_days_batch(uuid[], int) from public;
grant execute on function public.get_users_activity_recent_days_batch(uuid[], int) to authenticated;

create or replace function public.get_users_activity_week_count_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    coalesce(c.n, 0)::bigint
  from unnest(p_user_ids) as u(uid)
  left join lateral (
    select count(*)::bigint as n
    from public.user_activity_log l
    where l.user_id = u.uid
      and l.activity_ts >= timezone('utc', now()) - interval '7 days'
  ) c on true;
$$;

revoke all on function public.get_users_activity_week_count_batch(uuid[]) from public;
grant execute on function public.get_users_activity_week_count_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Activity triggers
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_activity_from_scan_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.log_user_activity(new.user_id, 'scan', new.created_at, '{}'::jsonb);
  end if;
  return new;
end;
$$;

revoke all on function public.tr_user_activity_from_scan_events() from public;

drop trigger if exists tr_user_activity_scan_events on public.scan_events;
create trigger tr_user_activity_scan_events
  after insert on public.scan_events
  for each row execute function public.tr_user_activity_from_scan_events();

create or replace function public.tr_user_activity_from_deck_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  did uuid;
  uid uuid;
begin
  if tg_op = 'DELETE' then
    did := old.deck_id;
  else
    did := new.deck_id;
  end if;
  select d.user_id into uid from public.decks d where d.id = did;
  if uid is not null then
    perform public.log_user_activity(uid, 'deck_edit', now(), '{}'::jsonb);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.tr_user_activity_from_deck_cards() from public;

drop trigger if exists tr_user_activity_deck_cards on public.deck_cards;
create trigger tr_user_activity_deck_cards
  after insert or update or delete on public.deck_cards
  for each row execute function public.tr_user_activity_from_deck_cards();

create or replace function public.tr_user_activity_from_binder_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
  uid uuid;
begin
  if tg_op = 'DELETE' then
    bid := old.binder_id;
  else
    bid := new.binder_id;
  end if;
  select b.user_id into uid from public.binders b where b.id = bid;
  if uid is not null then
    perform public.log_user_activity(uid, 'binder_edit', now(), '{}'::jsonb);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.tr_user_activity_from_binder_slots() from public;

drop trigger if exists tr_user_activity_binder_slots on public.binder_slots;
create trigger tr_user_activity_binder_slots
  after insert or update or delete on public.binder_slots
  for each row execute function public.tr_user_activity_from_binder_slots();

create or replace function public.tr_user_activity_from_seasonal_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_user_activity(
    new.user_id,
    'seasonal_event',
    coalesce(new.earned_at, now()),
    jsonb_build_object('eventId', new.event_id)
  );
  return new;
end;
$$;

revoke all on function public.tr_user_activity_from_seasonal_participation() from public;

drop trigger if exists tr_user_activity_seasonal on public.seasonal_event_participation;
create trigger tr_user_activity_seasonal
  after insert on public.seasonal_event_participation
  for each row execute function public.tr_user_activity_from_seasonal_participation();

create or replace function public.tr_user_activity_from_streaks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts timestamptz;
begin
  v_ts := ((timezone('utc', now()))::date + time '00:00:00') at time zone 'UTC';
  if new.user_id is not null then
    perform public.log_user_activity(
      new.user_id,
      'streak_update',
      v_ts,
      jsonb_build_object('streakCount', new.streak_count)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.tr_user_activity_from_streaks() from public;

drop trigger if exists tr_user_activity_streaks on public.user_activity_streaks;
create trigger tr_user_activity_streaks
  after insert or update on public.user_activity_streaks
  for each row execute function public.tr_user_activity_from_streaks();

create or replace function public.tr_user_activity_from_trade_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_user_activity(
    new.to_user_id,
    'trade_feedback',
    new.created_at,
    jsonb_build_object('kind', 'received')
  );
  return new;
end;
$$;

revoke all on function public.tr_user_activity_from_trade_feedback() from public;

drop trigger if exists tr_user_activity_trade_feedback on public.user_trade_feedback;
create trigger tr_user_activity_trade_feedback
  after insert on public.user_trade_feedback
  for each row execute function public.tr_user_activity_from_trade_feedback();

create or replace function public.tr_user_activity_from_value_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old bigint := 0;
  v_high constant bigint := 100000;
  v_ts_day timestamptz;
begin
  v_ts_day := ((timezone('utc', now()))::date + time '00:00:00') at time zone 'UTC';

  if tg_op = 'UPDATE' then
    v_old := coalesce(old.estimated_value_cents, 0);
  end if;

  if new.estimated_value_cents >= v_high and v_old < v_high then
    perform public.log_user_activity(
      new.user_id,
      'value_refresh',
      now(),
      jsonb_build_object('milestone', 'high_value_band', 'approxCentsRounded', (new.estimated_value_cents / 10000) * 10000)
    );
  end if;

  if tg_op = 'INSERT' then
    perform public.log_user_activity(new.user_id, 'value_refresh', v_ts_day, jsonb_build_object('kind', 'initial_sync'));
  elsif tg_op = 'UPDATE' then
    perform public.log_user_activity(new.user_id, 'value_refresh', v_ts_day, jsonb_build_object('kind', 'refresh'));
  end if;

  return new;
end;
$$;

revoke all on function public.tr_user_activity_from_value_cache() from public;

drop trigger if exists tr_user_activity_value_cache on public.user_collection_value_cache;
create trigger tr_user_activity_value_cache
  after insert or update on public.user_collection_value_cache
  for each row execute function public.tr_user_activity_from_value_cache();

notify pgrst, 'reload schema';
