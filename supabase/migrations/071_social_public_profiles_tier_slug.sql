-- Mirror user_tiers.tier_slug onto social_public_profiles for cross-user reads (RLS on user_tiers is own-row only).

alter table public.social_public_profiles
  add column if not exists tier_slug text null;

comment on column public.social_public_profiles.tier_slug is
  'Denormalized from user_tiers for public profile tier emblem; updated when user_tiers changes or projection runs.';

update public.social_public_profiles s
set tier_slug = ut.tier_slug
from public.user_tiers ut
where ut.user_id = s.user_id
  and (s.tier_slug is distinct from ut.tier_slug);

-- ---------------------------------------------------------------------------
-- Keep projection in sync when profiles row upserts
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
    favorite_card,
    favorite_set,
    favorite_color,
    joined_at,
    tier_slug,
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
    (select ut.tier_slug from public.user_tiers ut where ut.user_id = new.id limit 1),
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
    tier_slug = coalesce(excluded.tier_slug, public.social_public_profiles.tier_slug),
    updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Projection repair RPC: include tier from user_tiers
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
    favorite_card,
    favorite_set,
    favorite_color,
    joined_at,
    tier_slug,
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
    ut.tier_slug,
    now()
  from public.profiles p
  left join public.user_tiers ut on ut.user_id = p.id
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
    tier_slug = coalesce(excluded.tier_slug, public.social_public_profiles.tier_slug),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- When subscription / mock RPC updates user_tiers, mirror tier_slug
-- ---------------------------------------------------------------------------

create or replace function public.sync_social_public_profile_tier_from_user_tiers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_public_profiles
  set
    tier_slug = NEW.tier_slug,
    updated_at = now()
  where user_id = NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_user_tiers_sync_public_tier on public.user_tiers;
create trigger trg_user_tiers_sync_public_tier
  after insert or update of tier_slug on public.user_tiers
  for each row
  execute function public.sync_social_public_profile_tier_from_user_tiers();

notify pgrst, 'reload schema';
