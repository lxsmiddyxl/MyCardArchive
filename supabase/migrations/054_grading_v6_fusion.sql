-- Phase 73: Grading v6 — fusion metadata + stability + cross-user calibration columns on fingerprint.

alter table public.grading_user_fingerprint
  add column if not exists stability_score numeric,
  add column if not exists calibration_offset numeric default 0,
  add column if not exists fusion_meta jsonb not null default '{}'::jsonb;

comment on column public.grading_user_fingerprint.stability_score is '0–1 stability of recent grade outcomes for this collector (v6).';
comment on column public.grading_user_fingerprint.calibration_offset is 'Bias vs cohort average overall (v6 calibration).';
comment on column public.grading_user_fingerprint.fusion_meta is 'Last fusion payload (ensemble across pipeline heads v3–v5).';

-- Cohort average for calibration (cross-user, definer bypasses per-card RLS on aggregate).
create or replace function public.get_grading_cohort_avg_overall()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(avg(overall), 0)::numeric from public.card_grading_runs where overall is not null;
$$;

comment on function public.get_grading_cohort_avg_overall() is 'Global average overall grade for calibration (v6).';

grant execute on function public.get_grading_cohort_avg_overall() to authenticated;
