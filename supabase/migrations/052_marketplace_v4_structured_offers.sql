-- Phase 71: Marketplace v4 — structured offer payloads + auto-match engine (RPC).

alter table public.market_offers
  add column if not exists items_offered jsonb not null default '[]'::jsonb,
  add column if not exists items_requested jsonb not null default '[]'::jsonb,
  add column if not exists offer_notes text,
  add column if not exists expires_at timestamptz;

comment on column public.market_offers.items_offered is 'Structured catalog line items offered (json array of {catalog_card_id, qty}).';
comment on column public.market_offers.items_requested is 'Structured catalog line items requested from counterparty.';
comment on column public.market_offers.offer_notes is 'Optional short notes (supplements body for v4 structured offers).';
comment on column public.market_offers.expires_at is 'Optional offer expiration (non-binding).';

create index if not exists market_offers_expires_idx
  on public.market_offers (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------------------------------
-- Auto-match: reciprocal two-party FT/LF + 3-user trade loops (directed edges).
-- ---------------------------------------------------------------------------

create or replace function public.get_market_auto_matches()
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
    'reciprocal',
    coalesce(
      (
        select jsonb_agg(row_to_json(t))
        from (
          select distinct
            their_ft.user_id as other_user_id,
            my_lf.catalog_card_id as you_receive_catalog_id,
            their_lf.catalog_card_id as you_send_catalog_id
          from public.cards my_lf
          inner join public.cards their_ft
            on their_ft.catalog_card_id = my_lf.catalog_card_id
           and their_ft.for_trade = true
           and their_ft.user_id <> uid
           and their_ft.catalog_card_id is not null
          inner join public.cards their_lf
            on their_lf.user_id = their_ft.user_id
           and their_lf.looking_for = true
           and their_lf.catalog_card_id is not null
          inner join public.cards my_ft
            on my_ft.user_id = uid
           and my_ft.for_trade = true
           and my_ft.catalog_card_id = their_lf.catalog_card_id
          where my_lf.user_id = uid
            and my_lf.looking_for = true
            and my_lf.catalog_card_id is not null
          limit 80
        ) t
      ),
      '[]'::jsonb
    ),
    'loops_3',
    coalesce(
      (
        select jsonb_agg(row_to_json(x))
        from (
          select distinct
            e1.from_u as u1,
            e1.to_u as u2,
            e2.to_u as u3,
            e1.card_id as edge_12_catalog_id,
            e2.card_id as edge_23_catalog_id,
            e3.card_id as edge_31_catalog_id
          from (
            select
              ft.user_id as from_u,
              lf.user_id as to_u,
              ft.catalog_card_id as card_id
            from public.cards ft
            inner join public.cards lf
              on lf.catalog_card_id = ft.catalog_card_id
             and lf.user_id <> ft.user_id
             and ft.for_trade = true
             and lf.looking_for = true
             and ft.catalog_card_id is not null
          ) e1
          inner join (
            select
              ft.user_id as from_u,
              lf.user_id as to_u,
              ft.catalog_card_id as card_id
            from public.cards ft
            inner join public.cards lf
              on lf.catalog_card_id = ft.catalog_card_id
             and lf.user_id <> ft.user_id
             and ft.for_trade = true
             and lf.looking_for = true
             and ft.catalog_card_id is not null
          ) e2 on e1.to_u = e2.from_u and e2.to_u <> e1.from_u
          inner join (
            select
              ft.user_id as from_u,
              lf.user_id as to_u,
              ft.catalog_card_id as card_id
            from public.cards ft
            inner join public.cards lf
              on lf.catalog_card_id = ft.catalog_card_id
             and lf.user_id <> ft.user_id
             and ft.for_trade = true
             and lf.looking_for = true
             and ft.catalog_card_id is not null
          ) e3 on e2.to_u = e3.from_u and e3.to_u = e1.from_u
          where e1.from_u = uid
            and e1.from_u is distinct from e2.to_u
            and e2.from_u is distinct from e3.to_u
          limit 30
        ) x
      ),
      '[]'::jsonb
    )
  );
end;
$$;

comment on function public.get_market_auto_matches() is
  'Phase 71: reciprocal FT/LF pairs and 3-user trade loop hints for the current collector.';

grant execute on function public.get_market_auto_matches() to authenticated;
