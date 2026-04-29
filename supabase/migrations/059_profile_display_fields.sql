-- Profile system: public display fields on profiles, synced to social_public_profiles for cross-user read.

-- ---------------------------------------------------------------------------
-- profiles — canonical user-edited fields
-- ---------------------------------------------------------------------------

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

-- One handle per user, stored lowercase; uniqueness via expression index
create unique index if not exists profiles_handle_lower_unique
  on public.profiles (lower(handle))
  where handle is not null;

-- Backfill profile bio from public projection where missing
update public.profiles p
set bio = s.bio
from public.social_public_profiles s
where s.user_id = p.id
  and p.bio is null
  and s.bio is not null
  and length(trim(s.bio)) > 0;

-- ---------------------------------------------------------------------------
-- social_public_profiles — read by any authenticated user (author display)
-- ---------------------------------------------------------------------------

alter table public.social_public_profiles
  add column if not exists display_name text,
  add column if not exists handle text,
  add column if not exists location text,
  add column if not exists website text;

comment on column public.social_public_profiles.display_name is 'Denormalized from profiles for feed author resolution.';
comment on column public.social_public_profiles.handle is 'Denormalized from profiles.';

-- ---------------------------------------------------------------------------
-- Keep social_public_profiles in sync with profiles
-- ---------------------------------------------------------------------------

create or replace function public.sync_social_public_profile_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_public_profiles (
    user_id,
    username,
    avatar_url,
    bio,
    display_name,
    handle,
    location,
    website,
    updated_at
  )
  values (
    new.id,
    new.username,
    new.avatar_url,
    coalesce(new.bio, ''),
    new.display_name,
    new.handle,
    new.location,
    new.website,
    now()
  )
  on conflict (user_id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    bio = coalesce(nullif(excluded.bio, ''), public.social_public_profiles.bio, ''),
    display_name = excluded.display_name,
    handle = excluded.handle,
    location = excluded.location,
    website = excluded.website,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_social_public on public.profiles;
create trigger trg_profiles_sync_social_public
  after insert or update of username, avatar_url, display_name, handle, bio, location, website on public.profiles
  for each row
  execute function public.sync_social_public_profile_from_profiles();

-- Backfill social_public_profiles for existing users
insert into public.social_public_profiles (
  user_id, username, avatar_url, bio, display_name, handle, location, website, updated_at
)
select
  p.id,
  p.username,
  p.avatar_url,
  coalesce(p.bio, ''),
  p.display_name,
  p.handle,
  p.location,
  p.website,
  now()
from public.profiles p
on conflict (user_id) do update set
  username = excluded.username,
  avatar_url = excluded.avatar_url,
  bio = coalesce(nullif(excluded.bio, ''), public.social_public_profiles.bio, ''),
  display_name = excluded.display_name,
  handle = excluded.handle,
  location = excluded.location,
  website = excluded.website,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- ensure_social_public_profile_projection — include new columns
-- ---------------------------------------------------------------------------

create or replace function public.ensure_social_public_profile_projection(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_public_profiles (
    user_id,
    username,
    avatar_url,
    bio,
    display_name,
    handle,
    location,
    website,
    updated_at
  )
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(p.bio, ''),
    p.display_name,
    p.handle,
    p.location,
    p.website,
    now()
  from public.profiles p
  where p.id = p_user_id
  on conflict (user_id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    bio = coalesce(nullif(excluded.bio, ''), public.social_public_profiles.bio, ''),
    display_name = excluded.display_name,
    handle = excluded.handle,
    location = excluded.location,
    website = excluded.website,
    updated_at = now();
end;
$$;
