-- Emoji reactions on shared binders.

create table if not exists public.binder_reactions (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (binder_id, user_id, emoji)
);

create index if not exists binder_reactions_binder_idx
  on public.binder_reactions (binder_id);

alter table public.binder_reactions enable row level security;

drop policy if exists "binder_reactions_select_shared" on public.binder_reactions;
create policy "binder_reactions_select_shared"
  on public.binder_reactions
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.binders b
      where b.id = binder_reactions.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

drop policy if exists "binder_reactions_insert_auth" on public.binder_reactions;
create policy "binder_reactions_insert_auth"
  on public.binder_reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.binders b
      where b.id = binder_reactions.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

drop policy if exists "binder_reactions_delete_own" on public.binder_reactions;
create policy "binder_reactions_delete_own"
  on public.binder_reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.binder_reactions to anon;
grant insert, delete on table public.binder_reactions to authenticated;
