-- Deck analytics persisted on public.decks and recomputed after deck_cards changes.

alter table public.decks add column if not exists type_distribution jsonb default '{}'::jsonb;
alter table public.decks add column if not exists rarity_distribution jsonb default '{}'::jsonb;
alter table public.decks add column if not exists set_distribution jsonb default '{}'::jsonb;
alter table public.decks add column if not exists estimated_value numeric default 0;
alter table public.decks add column if not exists top_cards jsonb default '[]'::jsonb;

create or replace function public.compute_deck_stats(deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Type distribution (mapped from catalog_cards.supertype when available).
  update public.decks d
  set type_distribution = coalesce((
    select jsonb_object_agg(card_type, count_value)
    from (
      select
        coalesce(nullif(cc.supertype, ''), 'Unknown') as card_type,
        count(*)::int as count_value
      from public.deck_cards dc
      join public.cards c on c.id = dc.card_id
      left join public.catalog_cards cc on cc.id = c.catalog_card_id
      where dc.deck_id = d.id
      group by coalesce(nullif(cc.supertype, ''), 'Unknown')
    ) s
  ), '{}'::jsonb)
  where d.id = deck_id;

  -- Rarity distribution.
  update public.decks d
  set rarity_distribution = coalesce((
    select jsonb_object_agg(rarity_name, count_value)
    from (
      select
        coalesce(nullif(c.rarity, ''), 'Unknown') as rarity_name,
        count(*)::int as count_value
      from public.deck_cards dc
      join public.cards c on c.id = dc.card_id
      where dc.deck_id = d.id
      group by coalesce(nullif(c.rarity, ''), 'Unknown')
    ) s
  ), '{}'::jsonb)
  where d.id = deck_id;

  -- Set distribution (catalog set name or set_id; avoids cards.set_name for older DBs).
  update public.decks d
  set set_distribution = coalesce((
    select jsonb_object_agg(card_set, count_value)
    from (
      select
        coalesce(nullif(cs.name, ''), cc.set_id::text, 'Unknown') as card_set,
        count(*)::int as count_value
      from public.deck_cards dc
      join public.cards c on c.id = dc.card_id
      left join public.catalog_cards cc on cc.id = c.catalog_card_id
      left join public.catalog_sets cs on cs.id = cc.set_id
      where dc.deck_id = d.id
      group by coalesce(nullif(cs.name, ''), cc.set_id::text, 'Unknown')
    ) s
  ), '{}'::jsonb)
  where d.id = deck_id;

  -- Estimated value from latest known card_prices.market_price rows.
  update public.decks d
  set estimated_value = coalesce((
    select sum(coalesce(lp.market_price, 0))
    from public.deck_cards dc
    join public.cards c on c.id = dc.card_id
    left join lateral (
      select cp.market_price
      from public.card_prices cp
      where cp.card_id = c.id
      order by cp.updated_at desc
      limit 1
    ) lp on true
    where dc.deck_id = d.id
  ), 0)
  where d.id = deck_id;

  -- Top cards by latest known market price.
  update public.decks d
  set top_cards = coalesce((
    select jsonb_agg(row_to_json(t))
    from (
      select
        c.id,
        c.name,
        c.image_url,
        lp.market_price as price
      from public.deck_cards dc
      join public.cards c on c.id = dc.card_id
      left join lateral (
        select cp.market_price
        from public.card_prices cp
        where cp.card_id = c.id
        order by cp.updated_at desc
        limit 1
      ) lp on true
      where dc.deck_id = d.id
      order by lp.market_price desc nulls last, c.name asc
      limit 5
    ) t
  ), '[]'::jsonb)
  where d.id = deck_id;
end;
$$;

create or replace function public.trg_deck_stats_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.compute_deck_stats(coalesce(new.deck_id, old.deck_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists deck_stats_update on public.deck_cards;
create trigger deck_stats_update
after insert or update or delete on public.deck_cards
for each row execute function public.trg_deck_stats_update();

notify pgrst, 'reload schema';
