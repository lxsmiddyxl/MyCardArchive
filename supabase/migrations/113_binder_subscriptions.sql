-- Binder Upgrade Arc Phase 4: binder subscriptions.

create table if not exists public.binder_subscriptions (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint binder_subscriptions_unique unique (binder_id, user_id)
);

create index if not exists binder_subscriptions_binder_id_idx
  on public.binder_subscriptions (binder_id, created_at desc);

create index if not exists binder_subscriptions_user_id_idx
  on public.binder_subscriptions (user_id, created_at desc);

comment on table public.binder_subscriptions is 'Users subscribed to binder updates.';

alter table public.binder_subscriptions enable row level security;

drop policy if exists "binder_subscriptions_select" on public.binder_subscriptions;
create policy "binder_subscriptions_select"
  on public.binder_subscriptions
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.binders b
      where b.id = binder_subscriptions.binder_id
        and (b.user_id = auth.uid() or b.visibility in ('unlisted', 'public'))
    )
  );

drop policy if exists "binder_subscriptions_insert_own" on public.binder_subscriptions;
create policy "binder_subscriptions_insert_own"
  on public.binder_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "binder_subscriptions_delete_own" on public.binder_subscriptions;
create policy "binder_subscriptions_delete_own"
  on public.binder_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on table public.binder_subscriptions to authenticated;

create or replace function public.get_binder_subscriber_count(p_binder_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*)::int, 0)
  from public.binder_subscriptions bs
  where bs.binder_id = p_binder_id;
$$;

grant execute on function public.get_binder_subscriber_count(uuid) to anon, authenticated;
