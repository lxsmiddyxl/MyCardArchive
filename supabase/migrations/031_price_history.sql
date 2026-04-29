-- Price history snapshots per card (latest row remains in public.card_prices per card_id + provider).

create table public.card_price_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  market_price numeric not null,
  currency text not null default 'USD',
  provider text not null default 'tcgplayer',
  recorded_at timestamptz not null default now()
);

create index card_price_history_card_recorded_idx
  on public.card_price_history (card_id, recorded_at desc);

comment on table public.card_price_history is 'Historical market_price snapshots; card_prices holds the latest quote per card and provider.';

alter table public.card_price_history enable row level security;

create policy card_price_history_select_own
  on public.card_price_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cards c
      where c.id = card_price_history.card_id
        and c.user_id = auth.uid()
    )
  );

grant select on table public.card_price_history to authenticated;

notify pgrst, 'reload schema';
