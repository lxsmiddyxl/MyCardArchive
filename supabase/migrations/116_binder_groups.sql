-- Binder Upgrade Arc Phase 5: themed binder groups.

create table if not exists public.binder_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  created_at timestamptz not null default now(),
  constraint binder_groups_title_len check (char_length(trim(title)) between 1 and 120)
);

create index if not exists binder_groups_user_id_idx
  on public.binder_groups (user_id, created_at desc);

create table if not exists public.binder_group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.binder_groups (id) on delete cascade,
  binder_id uuid not null references public.binders (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint binder_group_items_unique unique (group_id, binder_id)
);

create index if not exists binder_group_items_group_pos_idx
  on public.binder_group_items (group_id, position);

alter table public.binder_groups enable row level security;
alter table public.binder_group_items enable row level security;

create policy "binder_groups_owner"
  on public.binder_groups for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "binder_groups_select_shared"
  on public.binder_groups for select to anon, authenticated
  using (
    exists (
      select 1 from public.binder_group_items gi
      join public.binders b on b.id = gi.binder_id
      where gi.group_id = binder_groups.id
        and b.visibility in ('unlisted', 'public')
    )
  );

create policy "binder_group_items_owner"
  on public.binder_group_items for all to authenticated
  using (
    exists (
      select 1 from public.binder_groups g
      where g.id = binder_group_items.group_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.binder_groups g
      where g.id = binder_group_items.group_id and g.user_id = auth.uid()
    )
  );

create policy "binder_group_items_select_shared"
  on public.binder_group_items for select to anon, authenticated
  using (
    exists (
      select 1 from public.binders b
      where b.id = binder_group_items.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

grant select, insert, update, delete on public.binder_groups to authenticated;
grant select on public.binder_groups to anon;
grant select, insert, update, delete on public.binder_group_items to authenticated;
grant select on public.binder_group_items to anon;
