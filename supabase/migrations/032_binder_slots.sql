-- Visual binder grid: one row per slot per page (default UI: 9 slots / page, indices 0–8).

create table public.binder_slots (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  slot_index integer not null,
  card_id uuid references public.cards (id) on delete set null,
  page_number integer not null default 0,
  created_at timestamptz not null default now(),
  constraint binder_slots_slot_index_non_negative check (slot_index >= 0 and slot_index < 24),
  constraint binder_slots_page_non_negative check (page_number >= 0),
  constraint binder_slots_binder_page_slot_key unique (binder_id, page_number, slot_index)
);

create index binder_slots_binder_id_idx on public.binder_slots (binder_id);
create index binder_slots_binder_page_idx on public.binder_slots (binder_id, page_number);

alter table public.binder_slots enable row level security;

create policy binder_slots_select_own
  on public.binder_slots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.user_id = auth.uid()
    )
  );

create policy binder_slots_insert_own
  on public.binder_slots
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.user_id = auth.uid()
    )
  );

create policy binder_slots_update_own
  on public.binder_slots
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.user_id = auth.uid()
    )
  );

create policy binder_slots_delete_own
  on public.binder_slots
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.binder_slots to authenticated;

notify pgrst, 'reload schema';
