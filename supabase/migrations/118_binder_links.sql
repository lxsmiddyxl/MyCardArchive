-- Binder Upgrade Arc Phase 5: binder-to-binder links.

create table if not exists public.binder_links (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  target_binder_id uuid not null references public.binders (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  constraint binder_links_no_self check (binder_id <> target_binder_id),
  constraint binder_links_label_len check (char_length(trim(label)) between 1 and 120)
);

create index if not exists binder_links_binder_id_idx
  on public.binder_links (binder_id, created_at desc);

alter table public.binder_links enable row level security;

create policy "binder_links_owner"
  on public.binder_links for all to authenticated
  using (
    exists (
      select 1 from public.binders b
      where b.id = binder_links.binder_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.binders b
      where b.id = binder_links.binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_links_select_shared"
  on public.binder_links for select to anon, authenticated
  using (
    exists (
      select 1 from public.binders b
      where b.id = binder_links.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

grant select, insert, update, delete on public.binder_links to authenticated;
grant select on public.binder_links to anon;
