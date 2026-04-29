-- favorite_card / favorite_set / favorite_color on profiles + social_public_profiles are authoritative for flair.
-- Legacy JSONB favorite_sets remains for backward compatibility (e.g. RPC overlap in 044_social_graph_v2.sql).

COMMENT ON COLUMN public.social_public_profiles.favorite_sets IS
  'Deprecated: replaced by favorite_card, favorite_set, favorite_color on profiles (mirrored here). Kept for backward compatibility.';
