-- Remote DBs may lack public.cards.set_name; keep set_distribution working via catalog only.
-- Idempotent: replaces function body only (no trigger/table changes).

create or replace function public.compute_deck_stats(deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
