-- Phase 3 collector profiles: canonical table is public.profiles + social_public_profiles.
-- This migration documents the handle-based public profile path for binders.

comment on column public.profiles.handle is
  'Unique public handle for /u/[handle] and binder owner links.';

create index if not exists profiles_handle_lower_idx
  on public.profiles (lower(handle))
  where handle is not null and length(trim(handle)) > 0;
