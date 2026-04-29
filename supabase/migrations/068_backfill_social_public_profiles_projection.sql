-- Backfill social_public_profiles for any profiles missing a projection row.

select public.ensure_social_public_profile_projection(p.id)
from public.profiles p
where not exists (
  select 1
  from public.social_public_profiles s
  where s.user_id = p.id
);
