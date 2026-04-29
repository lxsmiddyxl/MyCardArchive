-- Phase 72: Feed ranking v2 — ML-assisted (heuristic) blend + explicit signal breakdown.

create or replace function public.get_global_feed_v2(p_limit integer default 24, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  lim integer := greatest(1, least(coalesce(p_limit, 24), 50));
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(t))
      from (
        select
          fe.id,
          fe.kind,
          fe.actor_id,
          fe.subject_id,
          fe.payload,
          fe.created_at,
          rs.rank_score,
          rs.signals
        from public.feed_events fe
        cross join lateral (
          select
            (extract(epoch from fe.created_at)) as recency_epoch,
            (case
              when exists (
                select 1 from public.social_mutual_pairs smp
                where (smp.user_low = uid and smp.user_high = fe.actor_id)
                   or (smp.user_high = uid and smp.user_low = fe.actor_id)
              ) then 86400.0
              else 0.0
            end) as mutual_boost,
            (case
              when fe.kind = 'post' and fe.subject_id is not null then
                least(
                  coalesce(
                    (select count(*)::numeric from public.community_post_likes l where l.post_id = fe.subject_id),
                    0
                  ),
                  48
                ) * 130.0
              else 0.0
            end) as engagement_boost,
            (least(
              coalesce(
                (
                  select count(distinct cc1.set_id)::numeric
                  from public.cards c1
                  inner join public.catalog_cards cc1 on cc1.id = c1.catalog_card_id
                  inner join public.cards c2 on c2.user_id = fe.actor_id and c2.catalog_card_id is not null
                  inner join public.catalog_cards cc2 on cc2.id = c2.catalog_card_id and cc2.set_id = cc1.set_id
                  where c1.user_id = uid and c1.catalog_card_id is not null
                ),
                0
              ),
              14
            ) * 55.0) as shared_sets_boost,
            (least(
              coalesce(
                (
                  select count(*)::numeric
                  from public.cards c1
                  inner join public.cards c2
                    on c2.user_id = fe.actor_id
                   and c1.catalog_card_id = c2.catalog_card_id
                   and c1.catalog_card_id is not null
                  where c1.user_id = uid
                    and (
                      (c1.for_trade = true or c1.looking_for = true)
                      and (c2.for_trade = true or c2.looking_for = true)
                    )
                ),
                0
              ),
              24
            ) * 42.0) as market_overlap_boost,
            ((mod(abs(hashtext(fe.id::text)), 1000))::numeric / 9000.0) as ml_placeholder
        ) raw
        cross join lateral (
          select
            (
              raw.recency_epoch
              + raw.mutual_boost
              + raw.engagement_boost
              + raw.shared_sets_boost
              + raw.market_overlap_boost
              + raw.ml_placeholder
            ) as rank_score,
            jsonb_build_object(
              'recency_epoch', raw.recency_epoch,
              'mutual', raw.mutual_boost,
              'engagement', raw.engagement_boost,
              'shared_sets', raw.shared_sets_boost,
              'marketplace_overlap', raw.market_overlap_boost,
              'ml_assist', raw.ml_placeholder
            ) as signals
        ) rs
        where p_before is null or fe.created_at < p_before
        order by rs.rank_score desc, fe.created_at desc
        limit lim
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.get_global_feed_v2(integer, timestamptz) is
  'Phase 72: ranked feed with mutual, recency, engagement, shared sets, marketplace overlap, ML placeholder.';

grant execute on function public.get_global_feed_v2(integer, timestamptz) to authenticated;
