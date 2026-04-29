-- Market price snapshots per card (TCGplayer, eBay sold, Cardmarket).

create table public.card_prices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null
    constraint card_prices_provider_check
      check (provider in ('tcgplayer', 'ebay', 'cardmarket')),
  market_price numeric(14, 4),
  currency text not null default 'USD',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_prices_card_provider_key unique (card_id, provider)
);

comment on table public.card_prices is 'Latest cached market quotes per card and provider.';

create index card_prices_card_id_idx on public.card_prices (card_id);
create index card_prices_user_id_idx on public.card_prices (user_id);

create trigger card_prices_set_updated_at
  before update on public.card_prices
  for each row
  execute function public.set_updated_at();

alter table public.card_prices enable row level security;

create policy card_prices_select_own
  on public.card_prices
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy card_prices_insert_own
  on public.card_prices
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.cards c
      where c.id = card_id
        and c.user_id = auth.uid()
    )
  );

create policy card_prices_update_own
  on public.card_prices
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.cards c
      where c.id = card_id
        and c.user_id = auth.uid()
    )
  );

create policy card_prices_delete_own
  on public.card_prices
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.card_prices to authenticated;

notify pgrst, 'reload schema';
