-- Phase 66: Marketplace v3 — non-transactional offers, counters, decline + timeline.

-- ---------------------------------------------------------------------------
-- market_offers — threaded negotiation (root: parent_offer_id is null)
-- ---------------------------------------------------------------------------

create table public.market_offers (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  parent_offer_id uuid references public.market_offers (id) on delete set null,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  catalog_card_id text references public.catalog_cards (id) on delete set null,
  body text not null,
  status text not null default 'pending'
    constraint market_offers_status_check check (status in ('pending', 'countered', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_offers_distinct_users check (from_user_id <> to_user_id)
);

create index market_offers_thread_created_idx on public.market_offers (thread_id, created_at asc);
create index market_offers_to_user_idx on public.market_offers (to_user_id, created_at desc);
create index market_offers_from_user_idx on public.market_offers (from_user_id, created_at desc);

comment on table public.market_offers is 'Non-transactional marketplace offers between collectors (negotiation thread).';

-- Root row: after insert, thread_id := id (see trigger below).
create or replace function public.market_offers_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_offer_id is null then
    new.thread_id := gen_random_uuid();
  else
    select o.thread_id into new.thread_id
    from public.market_offers o
    where o.id = new.parent_offer_id;
    if new.thread_id is null then
      raise exception 'market_offers: parent not found';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_market_offers_before_insert on public.market_offers;
create trigger trg_market_offers_before_insert
  before insert on public.market_offers
  for each row
  execute function public.market_offers_before_insert();

create or replace function public.market_offers_after_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  tid uuid;
  ev text;
begin
  if new.parent_offer_id is null then
    update public.market_offers
    set thread_id = new.id, updated_at = now()
    where id = new.id;
    tid := new.id;
    ev := 'created';
  else
    update public.market_offers
    set status = 'countered', updated_at = now()
    where id = new.parent_offer_id and status = 'pending';
    tid := new.thread_id;
    ev := 'countered';
  end if;
  insert into public.market_offer_events (thread_id, offer_id, event_type, actor_id)
  values (tid, new.id, ev, new.from_user_id);
  return new;
end;
$$;

drop trigger if exists trg_market_offers_after_insert on public.market_offers;
create trigger trg_market_offers_after_insert
  after insert on public.market_offers
  for each row
  execute function public.market_offers_after_insert();

alter table public.market_offers enable row level security;

create policy "market_offers_select_participants"
  on public.market_offers for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "market_offers_insert_from_self"
  on public.market_offers for insert to authenticated
  with check (auth.uid() = from_user_id);

create policy "market_offers_update_participants"
  on public.market_offers for update to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id)
  with check (auth.uid() = from_user_id or auth.uid() = to_user_id);

grant select, insert, update on public.market_offers to authenticated;

-- ---------------------------------------------------------------------------
-- market_offer_events — append-only timeline (created / countered / declined)
-- ---------------------------------------------------------------------------

create table public.market_offer_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  offer_id uuid not null references public.market_offers (id) on delete cascade,
  event_type text not null
    constraint market_offer_events_type_check check (event_type in ('created', 'countered', 'declined')),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index market_offer_events_thread_idx on public.market_offer_events (thread_id, created_at asc);

comment on table public.market_offer_events is 'Timeline for marketplace offer threads.';

alter table public.market_offer_events enable row level security;

create policy "market_offer_events_select_thread_participants"
  on public.market_offer_events for select to authenticated
  using (
    exists (
      select 1 from public.market_offers o
      where o.thread_id = market_offer_events.thread_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

create policy "market_offer_events_insert_system"
  on public.market_offer_events for insert to authenticated
  with check (auth.uid() = actor_id);

grant select, insert on public.market_offer_events to authenticated;

create or replace function public.market_offer_events_on_offer_declined()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor uuid;
begin
  if new.status = 'declined' and (old.status is distinct from new.status) then
    actor := coalesce(auth.uid(), new.to_user_id, new.from_user_id);
    insert into public.market_offer_events (thread_id, offer_id, event_type, actor_id)
    values (new.thread_id, new.id, 'declined', actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_market_offer_events_on_decline on public.market_offers;
create trigger trg_market_offer_events_on_decline
  after update of status on public.market_offers
  for each row
  when (new.status = 'declined')
  execute function public.market_offer_events_on_offer_declined();
