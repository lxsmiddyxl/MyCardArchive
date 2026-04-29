-- Phase 68: Grading v5 — fingerprint, multi-model labels, optional peer card on runs.

alter table public.card_grading_runs
  add column if not exists model_label text,
  add column if not exists peer_card_id uuid references public.cards (id) on delete set null;

comment on column public.card_grading_runs.model_label is 'Optional human label when comparing multiple model heads.';
comment on column public.card_grading_runs.peer_card_id is 'Optional peer card used for cross-card consistency snapshot.';

create table public.grading_user_fingerprint (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  fingerprint text not null,
  model_versions text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

comment on table public.grading_user_fingerprint is 'Stable fingerprint of model versions seen for the collector (grading v5).';

alter table public.grading_user_fingerprint enable row level security;

create policy "grading_user_fingerprint_select_own"
  on public.grading_user_fingerprint for select to authenticated
  using (auth.uid() = user_id);

create policy "grading_user_fingerprint_insert_own"
  on public.grading_user_fingerprint for insert to authenticated
  with check (auth.uid() = user_id);

create policy "grading_user_fingerprint_update_own"
  on public.grading_user_fingerprint for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.grading_user_fingerprint to authenticated;
