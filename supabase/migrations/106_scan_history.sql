-- Scanning Phase 3: user scan history for quick re-add and audit trail.

create table public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text,
  best_catalog_card_id text,
  confidence numeric not null default 0,
  scan_event_id uuid references public.scan_events (id) on delete set null,
  created_at timestamptz not null default now()
);

create index scan_history_user_created_idx
  on public.scan_history (user_id, created_at desc);

comment on table public.scan_history is 'Recent catalog scans per user (Phase 3 intelligence pipeline).';

alter table public.scan_history enable row level security;

create policy "scan_history_select_own"
  on public.scan_history for select to authenticated
  using (auth.uid() = user_id);

create policy "scan_history_insert_own"
  on public.scan_history for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.scan_history to authenticated;
