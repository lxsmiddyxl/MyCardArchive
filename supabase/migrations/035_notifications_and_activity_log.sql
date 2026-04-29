-- Phase 14: notifications + activity_log (RLS: own rows; notifications updatable for read_at only).

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  trade_id uuid references public.trades (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

comment on table public.notifications is 'User notifications (in-app / trade-linked).';

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_insert_own"
  on public.notifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.notifications to authenticated;

-- Only read_at may change on UPDATE (other columns enforced below).
create or replace function public.notifications_read_at_only_update()
returns trigger
language plpgsql
as $$
begin
  if old.id is distinct from new.id
     or old.user_id is distinct from new.user_id
     or old.type is distinct from new.type
     or old.title is distinct from new.title
     or old.body is distinct from new.body
     or old.trade_id is distinct from new.trade_id
     or old.created_at is distinct from new.created_at
  then
    raise exception 'notifications: only read_at may be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_read_at_only on public.notifications;
create trigger notifications_read_at_only
  before update on public.notifications
  for each row
  execute function public.notifications_read_at_only_update();

-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  trade_id uuid references public.trades (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_user_id_created_at_idx
  on public.activity_log (user_id, created_at desc);

comment on table public.activity_log is 'Append-only per-user activity trail.';

alter table public.activity_log enable row level security;

create policy "activity_log_select_own"
  on public.activity_log
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "activity_log_insert_own"
  on public.activity_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on table public.activity_log to authenticated;
