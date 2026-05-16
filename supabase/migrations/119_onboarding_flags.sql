-- Launch Prep Phase 1: first-run onboarding and scan tutorial flags on profiles.

alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

alter table public.profiles
  add column if not exists scan_tutorial_seen boolean not null default false;

comment on column public.profiles.onboarding_complete is
  'True after the user finishes the /onboarding first-run flow.';

comment on column public.profiles.scan_tutorial_seen is
  'True after the user dismisses the scan page tutorial overlay.';
