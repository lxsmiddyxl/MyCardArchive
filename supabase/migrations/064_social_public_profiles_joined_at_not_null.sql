-- Align social_public_profiles.joined_at with profiles (required once backfilled).

UPDATE public.social_public_profiles s
SET joined_at = p.joined_at
FROM public.profiles p
WHERE s.user_id = p.id
  AND s.joined_at IS NULL;

UPDATE public.social_public_profiles
SET joined_at = now()
WHERE joined_at IS NULL;

ALTER TABLE public.social_public_profiles
  ALTER COLUMN joined_at SET NOT NULL;
