-- Phase 56: Social graph v1 — follows + public projections (profile, stats, activity).

-- ---------------------------------------------------------------------------
-- user_follows
-- ---------------------------------------------------------------------------

create table public.user_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index user_follows_follower_id_idx on public.user_follows (follower_id);
create index user_follows_following_id_idx on public.user_follows (following_id);

comment on table public.user_follows is 'Directed follow edges (follower → following).';

alter table public.user_follows enable row level security;

create policy "user_follows_select_authenticated"
  on public.user_follows
  for select
  to authenticated
  using (true);

create policy "user_follows_insert_own"
  on public.user_follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "user_follows_delete_own"
  on public.user_follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

grant select, insert, delete on table public.user_follows to authenticated;

-- ---------------------------------------------------------------------------
-- social_public_profiles — safe cross-user display (no email)
-- ---------------------------------------------------------------------------

create table public.social_public_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  username text,
  avatar_url text,
  bio text not null default '',
  favorite_sets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index social_public_profiles_updated_at_idx
  on public.social_public_profiles (updated_at desc);

comment on table public.social_public_profiles is
  'Public-facing profile fields; synced from profiles (username/avatar); bio/favorites owned here.';

alter table public.social_public_profiles enable row level security;

create policy "social_public_profiles_select_authenticated"
  on public.social_public_profiles
  for select
  to authenticated
  using (true);

create policy "social_public_profiles_insert_own"
  on public.social_public_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "social_public_profiles_update_own"
  on public.social_public_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.social_public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- social_collection_stats_public — denormalized counts for profile cards
-- ---------------------------------------------------------------------------

create table public.social_collection_stats_public (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  card_count integer not null default 0,
  binder_count integer not null default 0,
  deck_count integer not null default 0,
  trade_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index social_collection_stats_public_updated_at_idx
  on public.social_collection_stats_public (updated_at desc);

comment on table public.social_collection_stats_public is
  'Aggregated collection stats for social profile cards; refreshed via RPC.';

alter table public.social_collection_stats_public enable row level security;

create policy "social_collection_stats_public_select_authenticated"
  on public.social_collection_stats_public
  for select
  to authenticated
  using (true);

grant select on table public.social_collection_stats_public to authenticated;

-- ---------------------------------------------------------------------------
-- social_public_activity — projection of social-relevant activity_log rows
-- ---------------------------------------------------------------------------

create table public.social_public_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_activity_id uuid not null references public.activity_log (id) on delete cascade,
  action text not null,
  trade_id uuid references public.trades (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create unique index social_public_activity_source_activity_id_key
  on public.social_public_activity (source_activity_id);

create index social_public_activity_user_created_idx
  on public.social_public_activity (user_id, created_at desc);

comment on table public.social_public_activity is
  'Public-safe copy of selected activity_log rows for profile feeds.';

alter table public.social_public_activity enable row level security;

create policy "social_public_activity_select_authenticated"
  on public.social_public_activity
  for select
  to authenticated
  using (true);

grant select on table public.social_public_activity to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers & refresh RPCs (security definer)
-- ---------------------------------------------------------------------------

create or replace function public.social_activity_is_public(p_action text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_action, '')) like '%binder%'
    or lower(coalesce(p_action, '')) like '%deck%'
    or lower(coalesce(p_action, '')) like '%trade%'
    or lower(coalesce(p_action, '')) like '%card%'
    or lower(coalesce(p_action, '')) like '%slot%';
$$;

create or replace function public.refresh_social_collection_stats_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c integer;
  b integer;
  d integer;
  t integer;
begin
  select count(*)::integer into c from public.cards where user_id = p_user_id;
  select count(*)::integer into b from public.binders where user_id = p_user_id;
  select count(*)::integer into d from public.decks where user_id = p_user_id;
  select (
    coalesce((select count(*)::integer from public.trades where created_by = p_user_id), 0)
    + coalesce((select count(*)::integer from public.trades where counterparty_id = p_user_id), 0)
  ) into t;

  insert into public.social_collection_stats_public (
    user_id, card_count, binder_count, deck_count, trade_count, updated_at
  )
  values (p_user_id, c, b, d, t, now())
  on conflict (user_id) do update set
    card_count = excluded.card_count,
    binder_count = excluded.binder_count,
    deck_count = excluded.deck_count,
    trade_count = excluded.trade_count,
    updated_at = excluded.updated_at;
end;
$$;

comment on function public.refresh_social_collection_stats_for_user(uuid) is
  'Recomputes social_collection_stats_public for one user (definer; bypasses RLS).';

grant execute on function public.refresh_social_collection_stats_for_user(uuid) to authenticated;

create or replace function public.ensure_social_public_profile_projection(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_public_profiles (user_id, username, avatar_url, updated_at)
  select p.id, p.username, p.avatar_url, now()
  from public.profiles p
  where p.id = p_user_id
  on conflict (user_id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    updated_at = now();
end;
$$;

grant execute on function public.ensure_social_public_profile_projection(uuid) to authenticated;

create or replace function public.sync_social_public_profile_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_public_profiles (user_id, username, avatar_url, updated_at)
  values (new.id, new.username, new.avatar_url, now())
  on conflict (user_id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_social_public on public.profiles;
create trigger trg_profiles_sync_social_public
  after insert or update of username, avatar_url on public.profiles
  for each row
  execute function public.sync_social_public_profile_from_profiles();

create or replace function public.tg_activity_log_to_social_public_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.social_activity_is_public(new.action) then
    insert into public.social_public_activity (
      user_id, source_activity_id, action, trade_id, metadata, created_at
    )
    values (
      new.user_id, new.id, new.action, new.trade_id, new.metadata, new.created_at
    )
    on conflict (source_activity_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activity_log_social_projection on public.activity_log;
create trigger trg_activity_log_social_projection
  after insert on public.activity_log
  for each row
  execute function public.tg_activity_log_to_social_public_activity();

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

insert into public.social_public_profiles (user_id, username, avatar_url, bio, favorite_sets, updated_at)
select p.id, p.username, p.avatar_url, '', '[]'::jsonb, now()
from public.profiles p
on conflict (user_id) do nothing;

do $$
declare
  r record;
begin
  for r in select id from public.profiles
  loop
    perform public.refresh_social_collection_stats_for_user(r.id);
  end loop;
end $$;

insert into public.social_public_activity (
  user_id, source_activity_id, action, trade_id, metadata, created_at
)
select al.user_id, al.id, al.action, al.trade_id, al.metadata, al.created_at
from public.activity_log al
where public.social_activity_is_public(al.action)
on conflict (source_activity_id) do nothing;
