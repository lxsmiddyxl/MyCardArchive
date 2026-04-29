-- Phase 63: Grading v4 — persisted runs for temporal consistency / drift analysis.

create table public.card_grading_runs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  overall numeric,
  model_version text,
  pipeline_version text,
  inference_source text,
  created_at timestamptz not null default now()
);

create index card_grading_runs_card_created_idx
  on public.card_grading_runs (card_id, created_at desc);

comment on table public.card_grading_runs is 'Append-only grading results per card for drift and versioning.';

alter table public.card_grading_runs enable row level security;

create policy "card_grading_runs_select_own_cards"
  on public.card_grading_runs for select to authenticated
  using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

create policy "card_grading_runs_insert_own_cards"
  on public.card_grading_runs for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

grant select, insert on public.card_grading_runs to authenticated;
