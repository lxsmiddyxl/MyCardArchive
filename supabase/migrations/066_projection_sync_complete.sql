-- Complete social projection: all mirrored profile fields + trigger fires on username changes.
-- favorite_sets (JSONB) is not sourced from profiles; ON CONFLICT UPDATE omits it so existing values persist.

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
    favorite_card,
    favorite_set,
    favorite_color,
    joined_at,
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
    new.favorite_card,
    new.favorite_set,
    new.favorite_color,
    new.joined_at,
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
    favorite_card = excluded.favorite_card,
    favorite_set = excluded.favorite_set,
    favorite_color = excluded.favorite_color,
    joined_at = excluded.joined_at,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_social_public on public.profiles;
create trigger trg_profiles_sync_social_public
  after insert or update of
    username,
    avatar_url,
    display_name,
    handle,
    bio,
    location,
    website,
    favorite_card,
    favorite_set,
    favorite_color,
    joined_at
  on public.profiles
  for each row
  execute function public.sync_social_public_profile_from_profiles();

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
    favorite_card,
    favorite_set,
    favorite_color,
    joined_at,
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
    p.favorite_card,
    p.favorite_set,
    p.favorite_color,
    p.joined_at,
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
    favorite_card = excluded.favorite_card,
    favorite_set = excluded.favorite_set,
    favorite_color = excluded.favorite_color,
    joined_at = excluded.joined_at,
    updated_at = now();
end;
$$;
