-- Admin price sync calls compute_deck_stats via service_role.

GRANT EXECUTE ON FUNCTION public.compute_deck_stats(uuid) TO service_role;
