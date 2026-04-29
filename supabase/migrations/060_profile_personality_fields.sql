-- Profile personality flair, joined_at, social projection sync, and public profile stats RPC.
-- Depends on 059_profile_display_fields.sql (profiles display fields + social_public_profiles base).

-- ---------------------------------------------------------------------------
-- TASK 1 — profiles: flair + joined_at
-- Note: add joined_at nullable first, backfill from created_at, then default + NOT NULL
--       (adding NOT NULL DEFAULT now() before backfill would prevent aligning with created_at).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists favorite_card text,
  add column if not exists favorite_set text,
  add column if not exists favorite_color text,
  add column if not exists joined_at timestamptz;

comment on column public.profiles.favorite_card is 'Optional favorite Pokémon card name for profile flair.';
comment on column public.profiles.favorite_set is 'Optional favorite TCG set name.';
comment on column public.profiles.favorite_color is 'Accent color hint (CSS color name or hex).';
comment on column public.profiles.joined_at is 'When the trainer joined (aligned with account created_at).';

update public.profiles
set joined_at = created_at
where joined_at is null;

alter table public.profiles
  alter column joined_at set default now();

update public.profiles
set joined_at = now()
where joined_at is null;

alter table public.profiles
  alter column joined_at set not null;

-- ---------------------------------------------------------------------------
-- TASK 2 — social_public_profiles: same flair fields
-- ---------------------------------------------------------------------------

alter table public.social_public_profiles
  add column if not exists favorite_card text,
  add column if not exists favorite_set text,
  add column if not exists favorite_color text,
  add column if not exists joined_at timestamptz;

-- ---------------------------------------------------------------------------
-- TASK 5 — optional: unique(handle) on profiles (059 already has partial unique on lower(handle))
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_handle_unique'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_handle_unique unique (handle);
  end if;
exception
  when unique_violation then
    raise notice 'profiles_handle_unique not added: resolve duplicate handle values first';
end;
$$;

-- ---------------------------------------------------------------------------
-- TASK 3 — sync trigger + ensure_social_public_profile_projection
-- Syncs: display_name, handle, avatar_url, bio, location, website, favorites, joined_at
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

-- ---------------------------------------------------------------------------
-- TASK 4 — RPC: public activity counts (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.get_profile_public_counts(p_user_id uuid)
returns table (
  posts bigint,
  scans bigint,
  achievements bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::bigint from public.community_posts where author_id = p_user_id),
    (select count(*)::bigint from public.scan_events where user_id = p_user_id),
    (select count(*)::bigint from public.user_achievements where user_id = p_user_id);
$$;

comment on function public.get_profile_public_counts(uuid) is
  'Activity counts for trainer profiles (posts, scans, achievements unlocked). Uses SECURITY DEFINER to bypass per-user RLS on scans/achievements for aggregate counts.';

grant execute on function public.get_profile_public_counts(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- TASK 6 — Backfill social_public_profiles from profiles via projection
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select id from public.profiles
  loop
    perform public.ensure_social_public_profile_projection(r.id);
  end loop;
end;
$$;
