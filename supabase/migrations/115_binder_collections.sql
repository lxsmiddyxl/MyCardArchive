-- Binder Upgrade Arc Phase 5: user-organized binder collections.

create table if not exists public.binder_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint binder_collections_name_len check (char_length(trim(name)) between 1 and 80)
);

create index if not exists binder_collections_user_id_idx
  on public.binder_collections (user_id, created_at desc);

create table if not exists public.binder_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.binder_collections (id) on delete cascade,
  binder_id uuid not null references public.binders (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint binder_collection_items_unique unique (collection_id, binder_id)
);

create index if not exists binder_collection_items_collection_pos_idx
  on public.binder_collection_items (collection_id, position);

alter table public.binder_collections enable row level security;
alter table public.binder_collection_items enable row level security;

create policy "binder_collections_owner"
  on public.binder_collections for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "binder_collection_items_owner"
  on public.binder_collection_items for all to authenticated
  using (
    exists (
      select 1 from public.binder_collections c
      where c.id = binder_collection_items.collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.binder_collections c
      where c.id = binder_collection_items.collection_id and c.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.binder_collections to authenticated;
grant select, insert, update, delete on public.binder_collection_items to authenticated;
