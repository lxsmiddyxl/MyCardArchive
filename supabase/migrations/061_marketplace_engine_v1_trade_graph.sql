-- Phase 81: Marketplace engine v1 — trade graph (FT→LF edges), paths, multi-party loops.

-- ---------------------------------------------------------------------------
-- Directed edges: from_user has FT on card C, to_user has LF on C.
-- Used only inside SECURITY DEFINER RPCs (same semantics as get_market_auto_matches).
-- ---------------------------------------------------------------------------

create or replace function public.compute_trade_graph_for_user(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  edges_out jsonb;
  edges_in jsonb;
  reciprocal_paths jsonb;
  two_hop_paths jsonb;
  n_out bigint;
  n_in bigint;
begin
  if uid is null or uid <> auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into edges_out
  from (
    select e.to_user_id, e.catalog_card_id
    from (
      select distinct
        ft.user_id as from_user_id,
        lf.user_id as to_user_id,
        ft.catalog_card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id
       and lf.user_id <> ft.user_id
       and ft.for_trade = true
       and lf.looking_for = true
       and ft.catalog_card_id is not null
    ) e
    where e.from_user_id = uid
    limit 120
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into edges_in
  from (
    select e.from_user_id, e.catalog_card_id
    from (
      select distinct
        ft.user_id as from_user_id,
        lf.user_id as to_user_id,
        ft.catalog_card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id
       and lf.user_id <> ft.user_id
       and ft.for_trade = true
       and lf.looking_for = true
       and ft.catalog_card_id is not null
    ) e
    where e.to_user_id = uid
    limit 120
  ) t;

  select count(*) into n_out
  from (
    select 1
    from (
      select distinct ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as cid
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id
       and lf.user_id <> ft.user_id
       and ft.for_trade = true
       and lf.looking_for = true
       and ft.catalog_card_id is not null
    ) x
    where x.from_u = uid
  ) s;

  select count(*) into n_in
  from (
    select 1
    from (
      select distinct ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as cid
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id
       and lf.user_id <> ft.user_id
       and ft.for_trade = true
       and lf.looking_for = true
       and ft.catalog_card_id is not null
    ) x
    where x.to_u = uid
  ) s;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into reciprocal_paths
  from (
    select distinct
      'reciprocal'::text as kind,
      their_ft.user_id as partner_user_id,
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
    limit 60
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into two_hop_paths
  from (
    select distinct
      'two_hop'::text as kind,
      mid_lf.user_id as middle_user_id,
      my_ft.catalog_card_id as you_send_catalog_id,
      my_lf.catalog_card_id as you_receive_catalog_id
    from public.cards my_ft
    inner join public.cards mid_lf
      on mid_lf.user_id <> uid
     and mid_lf.looking_for = true
     and mid_lf.catalog_card_id = my_ft.catalog_card_id
     and mid_lf.catalog_card_id is not null
    inner join public.cards mid_ft
      on mid_ft.user_id = mid_lf.user_id
     and mid_ft.for_trade = true
     and mid_ft.catalog_card_id is not null
    inner join public.cards my_lf
      on my_lf.user_id = uid
     and my_lf.looking_for = true
     and my_lf.catalog_card_id = mid_ft.catalog_card_id
    where my_ft.user_id = uid
      and my_ft.for_trade = true
      and my_ft.catalog_card_id is not null
    limit 40
  ) t;

  return jsonb_build_object(
    'viewer_id', uid,
    'edge_count_out', coalesce(n_out, 0),
    'edge_count_in', coalesce(n_in, 0),
    'edges_out_sample', coalesce(edges_out, '[]'::jsonb),
    'edges_in_sample', coalesce(edges_in, '[]'::jsonb),
    'best_trade_paths',
      coalesce(reciprocal_paths, '[]'::jsonb) || coalesce(two_hop_paths, '[]'::jsonb)
  );
end;
$$;

comment on function public.compute_trade_graph_for_user(uuid) is
  'Phase 81: FT/LF trade graph neighborhood + best paths (reciprocal + two-hop) for the viewer.';

grant execute on function public.compute_trade_graph_for_user(uuid) to authenticated;

create or replace function public.compute_multi_party_loops(p_user_id uuid default auth.uid(), p_limit integer default 24)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  lim integer := greatest(1, least(coalesce(p_limit, 24), 48));
  loops3 jsonb;
  loops4 jsonb;
begin
  if uid is null or uid <> auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  into loops3
  from (
    select distinct
      e1.from_u as u1,
      e1.to_u as u2,
      e2.to_u as u3,
      e1.card_id as edge_12_catalog_id,
      e2.card_id as edge_23_catalog_id,
      e3.card_id as edge_31_catalog_id,
      3::integer as party_count
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
    limit lim
  ) x;

  select coalesce(jsonb_agg(row_to_json(y)), '[]'::jsonb)
  into loops4
  from (
    select distinct
      e1.from_u as u1,
      e1.to_u as u2,
      e2.to_u as u3,
      e3.to_u as u4,
      e1.card_id as edge_12_catalog_id,
      e2.card_id as edge_23_catalog_id,
      e3.card_id as edge_34_catalog_id,
      e4.card_id as edge_41_catalog_id,
      4::integer as party_count
    from (
      select ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id and lf.user_id <> ft.user_id
       and ft.for_trade = true and lf.looking_for = true and ft.catalog_card_id is not null
    ) e1
    inner join (
      select ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id and lf.user_id <> ft.user_id
       and ft.for_trade = true and lf.looking_for = true and ft.catalog_card_id is not null
    ) e2 on e1.to_u = e2.from_u and e2.to_u not in (e1.from_u)
    inner join (
      select ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id and lf.user_id <> ft.user_id
       and ft.for_trade = true and lf.looking_for = true and ft.catalog_card_id is not null
    ) e3 on e2.to_u = e3.from_u and e3.to_u not in (e1.from_u, e2.from_u)
    inner join (
      select ft.user_id as from_u, lf.user_id as to_u, ft.catalog_card_id as card_id
      from public.cards ft
      inner join public.cards lf
        on lf.catalog_card_id = ft.catalog_card_id and lf.user_id <> ft.user_id
       and ft.for_trade = true and lf.looking_for = true and ft.catalog_card_id is not null
    ) e4 on e3.to_u = e4.from_u and e4.to_u = e1.from_u
    where e1.from_u = uid
      and e1.from_u <> e2.to_u
      and e1.from_u <> e3.to_u
      and e1.from_u <> e4.to_u
      and e2.to_u <> e3.to_u
      and e2.to_u <> e4.to_u
      and e3.to_u <> e4.to_u
    limit greatest(1, lim / 2)
  ) y;

  return jsonb_build_object(
    'loops_3', coalesce(loops3, '[]'::jsonb),
    'loops_4', coalesce(loops4, '[]'::jsonb)
  );
end;
$$;

comment on function public.compute_multi_party_loops(uuid, integer) is
  'Phase 81: 3- and 4-party directed FT/LF loops involving the viewer.';

grant execute on function public.compute_multi_party_loops(uuid, integer) to authenticated;
