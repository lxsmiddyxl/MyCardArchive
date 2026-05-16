-- Comments on shared binders.

create table if not exists public.binder_comments (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists binder_comments_binder_created_idx
  on public.binder_comments (binder_id, created_at desc);

alter table public.binder_comments enable row level security;

drop policy if exists "binder_comments_select_shared" on public.binder_comments;
create policy "binder_comments_select_shared"
  on public.binder_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.binders b
      where b.id = binder_comments.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

drop policy if exists "binder_comments_insert_auth" on public.binder_comments;
create policy "binder_comments_insert_auth"
  on public.binder_comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and length(trim(text)) > 0
    and exists (
      select 1 from public.binders b
      where b.id = binder_comments.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

drop policy if exists "binder_comments_delete_own" on public.binder_comments;
create policy "binder_comments_delete_own"
  on public.binder_comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.binder_comments to anon;
grant insert, delete on table public.binder_comments to authenticated;
