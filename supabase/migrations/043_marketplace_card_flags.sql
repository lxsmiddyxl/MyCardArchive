-- Phase 57: Marketplace foundations — For Trade / Looking For on cards + discovery RPC.

alter table public.cards
  add column if not exists for_trade boolean not null default false,
  add column if not exists looking_for boolean not null default false;

comment on column public.cards.for_trade is 'Collector marked this card as available for trade (marketplace signal).';
comment on column public.cards.looking_for is 'Collector is seeking this catalog card (marketplace signal).';

create index if not exists cards_catalog_for_trade_idx
  on public.cards (catalog_card_id)
  where for_trade = true and catalog_card_id is not null;

create index if not exists cards_catalog_looking_for_idx
  on public.cards (catalog_card_id)
  where looking_for = true and catalog_card_id is not null;

create index if not exists cards_user_market_flags_idx
  on public.cards (user_id, for_trade, looking_for);

-- Aggregated discovery for authenticated users (definer bypasses cards RLS).
create or replace function public.get_market_discovery()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    'want_by_catalog',
    coalesce(
      (
        select jsonb_agg(row_to_json(t))
        from (
          select
            c.catalog_card_id as catalog_card_id,
            count(*)::integer as card_count,
            count(distinct c.user_id)::integer as collector_count
          from public.cards c
          where c.looking_for = true
            and c.catalog_card_id is not null
          group by c.catalog_card_id
          order by collector_count desc, c.catalog_card_id
          limit 200
        ) t
      ),
      '[]'::jsonb
    ),
    'offer_by_catalog',
    coalesce(
      (
        select jsonb_agg(row_to_json(t))
        from (
          select
            c.catalog_card_id as catalog_card_id,
            count(*)::integer as card_count,
            count(distinct c.user_id)::integer as collector_count
          from public.cards c
          where c.for_trade = true
            and c.catalog_card_id is not null
          group by c.catalog_card_id
          order by collector_count desc, c.catalog_card_id
          limit 200
        ) t
      ),
      '[]'::jsonb
    ),
    'match_hints',
    coalesce(
      (
        select jsonb_agg(row_to_json(t))
        from (
          select distinct q.catalog_card_id, q.match_kind
          from (
            select
              w.catalog_card_id,
              'you_lf_they_ft'::text as match_kind
            from (
              select distinct c.catalog_card_id
              from public.cards c
              where c.user_id = uid
                and c.looking_for = true
                and c.catalog_card_id is not null
            ) w
            where exists (
              select 1
              from public.cards o
              where o.user_id <> uid
                and o.for_trade = true
                and o.catalog_card_id = w.catalog_card_id
            )
            union
            select
              o.catalog_card_id,
              'you_ft_they_lf'::text as match_kind
            from (
              select distinct c.catalog_card_id
              from public.cards c
              where c.user_id = uid
                and c.for_trade = true
                and c.catalog_card_id is not null
            ) o
            where exists (
              select 1
              from public.cards w2
              where w2.user_id <> uid
                and w2.looking_for = true
                and w2.catalog_card_id = o.catalog_card_id
            )
          ) q
          limit 100
        ) t
      ),
      '[]'::jsonb
    )
  );
end;
$$;

comment on function public.get_market_discovery() is
  'Cross-user marketplace aggregates; callable only when authenticated.';

grant execute on function public.get_market_discovery() to authenticated;
