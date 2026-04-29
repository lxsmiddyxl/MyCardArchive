-- Phase 78: Temporal drift model, drift history, recalibration RPC.

create table public.grading_user_drift_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  computed_at timestamptz not null default now(),
  slope_per_day numeric,
  expected_shift_7d numeric not null default 0,
  sample_size integer not null default 0,
  calibration_delta numeric,
  series jsonb not null default '[]'::jsonb
);

create index grading_user_drift_history_user_computed_idx
  on public.grading_user_drift_history (user_id, computed_at desc);

comment on table public.grading_user_drift_history is 'Append-only snapshots of temporal drift estimates per collector (grading v7).';

alter table public.grading_user_drift_history enable row level security;

create policy "grading_user_drift_history_select_own"
  on public.grading_user_drift_history for select to authenticated
  using (user_id = auth.uid());

grant select on public.grading_user_drift_history to authenticated;

-- ---------------------------------------------------------------------------
-- Drift model: linear trend of overall vs time (epoch seconds), last 48 runs.
-- ---------------------------------------------------------------------------

create or replace function public.grading_compute_temporal_drift(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  slope double precision;
  ic double precision;
  n bigint;
  shift7 double precision;
  spd numeric;
  series jsonb;
begin
  if uid is null or uid <> auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  with recent as (
    select
      cgr.overall::double precision as y,
      extract(epoch from cgr.created_at)::double precision as t,
      cgr.created_at as at
    from public.card_grading_runs cgr
    where cgr.user_id = uid and cgr.overall is not null
    order by cgr.created_at desc
    limit 48
  ),
  ordered as (
    select * from recent order by at asc
  ),
  agg as (
    select
      count(*)::bigint as c,
      regr_slope(o.y, o.t) as sl,
      regr_intercept(o.y, o.t) as inter
    from ordered o
  )
  select a.c, a.sl, a.inter into n, slope, ic from agg a;

  if n is null or n < 2 then
    slope := 0;
    ic := 0;
    shift7 := 0;
    spd := 0;
  else
    slope := coalesce(slope, 0);
    ic := coalesce(ic, 0);
    spd := round((slope * 86400.0)::numeric, 6);
    shift7 := slope * 7.0 * 86400.0;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'epoch', extract(epoch from x.created_at),
        'overall', x.overall,
        'at', x.created_at
      ) order by x.created_at asc
    ),
    '[]'::jsonb
  )
  into series
  from (
    select overall, created_at
    from public.card_grading_runs
    where user_id = uid and overall is not null
    order by created_at desc
    limit 48
  ) x;

  return jsonb_build_object(
    'sampleSize', coalesce(n, 0),
    'slopePerDay', spd,
    'expectedShift7d', round(coalesce(shift7, 0)::numeric, 4),
    'intercept', round(coalesce(ic, 0)::numeric, 4),
    'series', coalesce(series, '[]'::jsonb)
  );
end;
$$;

comment on function public.grading_compute_temporal_drift(uuid) is 'Phase 78: expected grade shift from linear drift on recent runs.';

grant execute on function public.grading_compute_temporal_drift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Recalibration: nudge calibration_offset from drift estimate, log history.
-- ---------------------------------------------------------------------------

create or replace function public.grading_recalibrate_for_drift(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  j jsonb;
  shift numeric;
  adj numeric;
  spd numeric;
  n int;
  ser jsonb;
begin
  if uid is null or uid <> auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  j := public.grading_compute_temporal_drift(uid);
  if j ? 'error' then
    return j;
  end if;

  shift := coalesce((j->>'expectedShift7d')::numeric, 0);
  adj := least(10::numeric, greatest(-10::numeric, round((shift * 0.28)::numeric, 2)));
  spd := coalesce((j->>'slopePerDay')::numeric, 0);
  n := coalesce((j->>'sampleSize')::int, 0);
  ser := coalesce(j->'series', '[]'::jsonb);

  update public.grading_user_fingerprint
  set
    calibration_offset = coalesce(calibration_offset, 0) + adj,
    updated_at = now()
  where user_id = uid;

  insert into public.grading_user_drift_history (
    user_id,
    slope_per_day,
    expected_shift_7d,
    sample_size,
    calibration_delta,
    series
  )
  values (uid, spd, shift, n, adj, ser);

  return jsonb_build_object(
    'adjustedBy', adj,
    'drift', j
  );
end;
$$;

comment on function public.grading_recalibrate_for_drift(uuid) is 'Phase 78: apply drift-informed calibration nudge and append drift history row.';

grant execute on function public.grading_recalibrate_for_drift(uuid) to authenticated;
