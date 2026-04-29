-- Backfill deck analytics for all existing decks (idempotent: only recomputes stats).
-- Depends on: 027_deck_analytics.sql, 028_deck_analytics_compute_deck_stats_set_compat.sql

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.decks LOOP
    PERFORM public.compute_deck_stats(rec.id);
  END LOOP;
END;
$$;
