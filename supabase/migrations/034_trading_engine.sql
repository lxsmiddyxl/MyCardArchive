-- Trades: trades, trade_items, trade_messages with RLS (select / insert / update).

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft'
    constraint trades_status_check
      check (status in ('draft', 'sent', 'accepted', 'declined', 'countered', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_distinct_parties check (created_by <> counterparty_id)
);

create index trades_created_by_idx on public.trades (created_by);
create index trades_counterparty_idx on public.trades (counterparty_id);
create index trades_status_idx on public.trades (status);

comment on table public.trades is 'Peer trade between two profiles.';

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row
  execute function public.set_updated_at();

alter table public.trades enable row level security;

create policy "trades_select_participant"
  on public.trades
  for select
  to authenticated
  using (auth.uid() = created_by or auth.uid() = counterparty_id);

create policy "trades_insert_creator"
  on public.trades
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "trades_update_participant"
  on public.trades
  for update
  to authenticated
  using (auth.uid() = created_by or auth.uid() = counterparty_id)
  with check (auth.uid() = created_by or auth.uid() = counterparty_id);

grant select, insert, update on table public.trades to authenticated;

-- ---------------------------------------------------------------------------
-- trade_items
-- ---------------------------------------------------------------------------

create table public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null,
  side text not null,
  constraint trade_items_quantity_pos check (quantity > 0),
  constraint trade_items_side_check check (side in ('offer', 'request'))
);

create index trade_items_trade_id_idx on public.trade_items (trade_id);
create index trade_items_card_id_idx on public.trade_items (card_id);

comment on table public.trade_items is 'Cards in a trade: offer vs request side.';

alter table public.trade_items enable row level security;

create policy "trade_items_select_participant"
  on public.trade_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trades t
      where t.id = trade_items.trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  );

create policy "trade_items_insert_participant"
  on public.trade_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.trades t
      where t.id = trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  );

create policy "trade_items_update_participant"
  on public.trade_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.trades t
      where t.id = trade_items.trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  )
  with check (
    exists (
      select 1
      from public.trades t
      where t.id = trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  );

grant select, insert, update on table public.trade_items to authenticated;

-- ---------------------------------------------------------------------------
-- trade_messages
-- ---------------------------------------------------------------------------

create table public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index trade_messages_trade_id_idx on public.trade_messages (trade_id, created_at desc);

comment on table public.trade_messages is 'Messages on a trade thread.';

alter table public.trade_messages enable row level security;

create policy "trade_messages_select_participant"
  on public.trade_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trades t
      where t.id = trade_messages.trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  );

create policy "trade_messages_insert_sender"
  on public.trade_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.trades t
      where t.id = trade_id
        and (auth.uid() = t.created_by or auth.uid() = t.counterparty_id)
    )
  );

create policy "trade_messages_update_sender"
  on public.trade_messages
  for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

grant select, insert, update on table public.trade_messages to authenticated;
