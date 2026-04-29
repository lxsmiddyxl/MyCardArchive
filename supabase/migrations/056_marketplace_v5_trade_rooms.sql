-- Phase 76: Trade rooms + append-only offer revision log (structured negotiation).

create table public.market_trade_rooms (
  thread_id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.market_trade_rooms is 'One row per marketplace offer thread (Phase 76 trade room shell).';

create table public.market_offer_revisions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  seq integer not null,
  offer_id uuid not null references public.market_offers (id) on delete cascade,
  snapshot jsonb not null,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint market_offer_revisions_thread_seq unique (thread_id, seq)
);

create index market_offer_revisions_thread_idx on public.market_offer_revisions (thread_id, seq asc);

comment on table public.market_offer_revisions is 'Append-only negotiation snapshots per thread (new offer or revise).';

-- ---------------------------------------------------------------------------
-- Triggers: ensure trade room row + revision on each new offer row
-- ---------------------------------------------------------------------------

create or replace function public.market_offers_v5_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_seq integer;
begin
  insert into public.market_trade_rooms (thread_id, updated_at)
  values (new.thread_id, now())
  on conflict (thread_id) do update set updated_at = now();

  select coalesce(max(mor.seq), 0) + 1 into next_seq
  from public.market_offer_revisions mor
  where mor.thread_id = new.thread_id;

  insert into public.market_offer_revisions (thread_id, seq, offer_id, snapshot, actor_id)
  values (
    new.thread_id,
    next_seq,
    new.id,
    jsonb_build_object(
      'body', new.body,
      'items_offered', coalesce(new.items_offered, '[]'::jsonb),
      'items_requested', coalesce(new.items_requested, '[]'::jsonb),
      'offer_notes', new.offer_notes,
      'expires_at', new.expires_at
    ),
    new.from_user_id
  );

  return new;
end;
$$;

drop trigger if exists trg_market_offers_v5_after_insert on public.market_offers;
create trigger trg_market_offers_v5_after_insert
  after insert on public.market_offers
  for each row
  execute function public.market_offers_v5_after_insert();

-- Revision log when a pending offer is amended in place (Phase 76 revise).
create or replace function public.market_offers_v5_after_update_revise()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_seq integer;
begin
  if new.body is not distinct from old.body
     and new.items_offered is not distinct from old.items_offered
     and new.items_requested is not distinct from old.items_requested
     and new.offer_notes is not distinct from old.offer_notes
     and new.expires_at is not distinct from old.expires_at
  then
    return new;
  end if;

  update public.market_trade_rooms
  set updated_at = now()
  where thread_id = new.thread_id;

  select coalesce(max(mor.seq), 0) + 1 into next_seq
  from public.market_offer_revisions mor
  where mor.thread_id = new.thread_id;

  insert into public.market_offer_revisions (thread_id, seq, offer_id, snapshot, actor_id)
  values (
    new.thread_id,
    next_seq,
    new.id,
    jsonb_build_object(
      'body', new.body,
      'items_offered', coalesce(new.items_offered, '[]'::jsonb),
      'items_requested', coalesce(new.items_requested, '[]'::jsonb),
      'offer_notes', new.offer_notes,
      'expires_at', new.expires_at
    ),
    new.from_user_id
  );

  return new;
end;
$$;

drop trigger if exists trg_market_offers_v5_after_update on public.market_offers;
create trigger trg_market_offers_v5_after_update
  after update on public.market_offers
  for each row
  execute function public.market_offers_v5_after_update_revise();

alter table public.market_trade_rooms enable row level security;
alter table public.market_offer_revisions enable row level security;

create policy "market_trade_rooms_select_participants"
  on public.market_trade_rooms for select to authenticated
  using (
    exists (
      select 1 from public.market_offers o
      where o.thread_id = market_trade_rooms.thread_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

create policy "market_offer_revisions_select_participants"
  on public.market_offer_revisions for select to authenticated
  using (
    exists (
      select 1 from public.market_offers o
      where o.thread_id = market_offer_revisions.thread_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

grant select on public.market_trade_rooms to authenticated;
grant select on public.market_offer_revisions to authenticated;
