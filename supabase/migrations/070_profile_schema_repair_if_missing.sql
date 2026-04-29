-- Idempotent repair when history shows 059_profile_display_fields applied but columns are missing.
-- Version 0595 sorts before 059_profile_* lexicographically and uses a unique schema_migrations key.
-- Safe no-op when columns already exist.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists handle text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists website text;

comment on column public.profiles.display_name is 'Sanitized public display name (2–32 chars in app).';
comment on column public.profiles.handle is 'Unique public handle, lowercase a-z0-9_ in app.';
comment on column public.profiles.bio is 'User bio; also mirrored to social_public_profiles.bio.';
comment on column public.profiles.location is 'Free-text location, sanitized in app.';
comment on column public.profiles.website is 'Public website URL, validated in app.';

create unique index if not exists profiles_handle_lower_unique
  on public.profiles (lower(handle))
  where handle is not null;

alter table public.social_public_profiles
  add column if not exists display_name text,
  add column if not exists handle text,
  add column if not exists location text,
  add column if not exists website text;

comment on column public.social_public_profiles.display_name is 'Denormalized from profiles for feed author resolution.';
comment on column public.social_public_profiles.handle is 'Denormalized from profiles.';
