-- Phase 26: Ephemeral collector rooms (ambient, presence-driven, no chat).
-- topic_key: catalog set id (uuid string), club slug, profile user id (uuid string), or null for live_feed_room.
-- Room membership refresh is application-driven: /api/collector-rooms/refresh, /api/feed, /api/social/presence/touch,
-- plus dissolve_expired_rooms via AFTER trigger on user_presence (no contextual join from presence row alone).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.collector_rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_type text not null
    check (room_type in ('set_room', 'club_room', 'live_feed_room', 'profile_room')),
  topic_key text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.collector_rooms is
  'Ephemeral context rooms; expire after inactivity. topic_key: set id, club slug, profile user id, or null (live feed).';
comment on column public.collector_rooms.topic_key is
  'Null only for live_feed_room; otherwise set uuid, club slug, or profile user uuid as text.';

create unique index if not exists collector_rooms_one_live
  on public.collector_rooms (room_type)
  where room_type = 'live_feed_room';

create unique index if not exists collector_rooms_type_topic
  on public.collector_rooms (room_type, topic_key)
  where topic_key is not null;

create index if not exists collector_rooms_expires_idx
  on public.collector_rooms (expires_at);

create table if not exists public.collector_room_members (
  room_id uuid not null references public.collector_rooms (room_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists collector_room_members_user_idx
  on public.collector_room_members (user_id);

create index if not exists collector_room_members_seen_idx
  on public.collector_room_members (last_seen_at);

-- ---------------------------------------------------------------------------
-- Role grants (RPC + policies handle visibility)
-- ---------------------------------------------------------------------------

alter table public.collector_rooms enable row level security;
alter table public.collector_room_members enable row level security;

-- ---------------------------------------------------------------------------
-- dissolve_expired_rooms — prune stale members + drop expired / empty rooms
-- ---------------------------------------------------------------------------

create or replace function public.dissolve_expired_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.collector_room_members crm
  using public.collector_rooms cr
  where crm.room_id = cr.room_id
    and crm.last_seen_at < now() - interval '10 minutes';

  delete from public.collector_rooms cr
  where cr.expires_at < now()
     or not exists (select 1 from public.collector_room_members m where m.room_id = cr.room_id);
end;
$$;

revoke all on function public.dissolve_expired_rooms() from public;
grant execute on function public.dissolve_expired_rooms() to authenticated;
grant execute on function public.dissolve_expired_rooms() to service_role;

-- ---------------------------------------------------------------------------
-- refresh_collector_room
-- ---------------------------------------------------------------------------

create or replace function public.refresh_collector_room(
  p_user_id uuid,
  p_room_type text,
  p_topic_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rt text := lower(trim(coalesce(p_room_type, '')));
  v_key text := nullif(trim(coalesce(p_topic_key, '')), '');
  v_room_id uuid;
  v_ttl interval := interval '10 minutes';
begin
  if p_user_id is null then
    return null;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if v_rt not in ('set_room', 'club_room', 'live_feed_room', 'profile_room') then
    return null;
  end if;

  if v_rt = 'live_feed_room' then
    v_key := null;
  elsif v_key is null then
    return null;
  end if;

  perform public.dissolve_expired_rooms();

  if v_rt = 'live_feed_room' then
    select room_id into v_room_id
    from public.collector_rooms
    where room_type = 'live_feed_room'
    limit 1;

    if v_room_id is null then
      insert into public.collector_rooms (room_type, topic_key, expires_at)
      values ('live_feed_room', null, now() + v_ttl)
      returning room_id into v_room_id;
    else
      update public.collector_rooms
      set expires_at = now() + v_ttl
      where room_id = v_room_id;
    end if;
  else
    select room_id into v_room_id
    from public.collector_rooms
    where room_type = v_rt and topic_key is not distinct from v_key
    limit 1;

    if v_room_id is null then
      insert into public.collector_rooms (room_type, topic_key, expires_at)
      values (v_rt, v_key, now() + v_ttl)
      returning room_id into v_room_id;
    else
      update public.collector_rooms
      set expires_at = now() + v_ttl
      where room_id = v_room_id;
    end if;
  end if;

  insert into public.collector_room_members (room_id, user_id, joined_at, last_seen_at)
  values (v_room_id, p_user_id, now(), now())
  on conflict (room_id, user_id) do update
  set last_seen_at = excluded.last_seen_at;

  return v_room_id;
end;
$$;

revoke all on function public.refresh_collector_room(uuid, text, text) from public;
grant execute on function public.refresh_collector_room(uuid, text, text) to authenticated;
grant execute on function public.refresh_collector_room(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- RPCs: active rooms, members, qualitative spotlights
-- ---------------------------------------------------------------------------

create or replace function public.get_active_rooms_for_user(p_user_id uuid)
returns table (
  room_id uuid,
  room_type text,
  topic_key text,
  expires_at timestamptz,
  member_total integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  perform public.dissolve_expired_rooms();

  return query
  select
    cr.room_id,
    cr.room_type,
    cr.topic_key,
    cr.expires_at,
    coalesce(mc.cnt, 0)::integer as member_total
  from public.collector_room_members crm
  join public.collector_rooms cr on cr.room_id = crm.room_id
  left join lateral (
    select count(*)::bigint as cnt
    from public.collector_room_members m
    where m.room_id = cr.room_id
      and m.last_seen_at >= now() - interval '10 minutes'
  ) mc on true
  where crm.user_id = p_user_id
    and cr.expires_at >= now()
    and crm.last_seen_at >= now() - interval '10 minutes';
end;
$$;

revoke all on function public.get_active_rooms_for_user(uuid) from public;
grant execute on function public.get_active_rooms_for_user(uuid) to authenticated;

create or replace function public.get_room_members(p_room_id uuid)
returns table (
  user_id uuid,
  avatar_url text,
  display_name text,
  username text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_room_id is null then
    return;
  end if;

  perform public.dissolve_expired_rooms();

  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1 from public.collector_room_members m
    where m.room_id = p_room_id and m.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id as user_id,
    spp.avatar_url,
    coalesce(spp.display_name, p.username) as display_name,
    p.username
  from public.collector_room_members crm
  join public.profiles p on p.id = crm.user_id
  left join public.social_public_profiles spp on spp.user_id = p.id
  where crm.room_id = p_room_id
    and crm.last_seen_at >= now() - interval '10 minutes'
  order by crm.last_seen_at desc
  limit 24;
end;
$$;

revoke all on function public.get_room_members(uuid) from public;
grant execute on function public.get_room_members(uuid) to authenticated;

create or replace function public.get_room_spotlights(p_limit integer)
returns table (
  note text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 8), 24));
begin
  perform public.dissolve_expired_rooms();

  return query
  select case (floor(random() * 4))::int
    when 0 then 'Collectors quietly crossing paths — ambient energy, no chatter.'
    when 1 then 'Shared browsing moments — presence without pressure.'
    when 2 then 'Season-aligned curiosity in the room.'
    else 'Light overlap — the hobby stays welcoming.'
  end::text
  from generate_series(1, v_lim);
end;
$$;

revoke all on function public.get_room_spotlights(integer) from public;
grant execute on function public.get_room_spotlights(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies (qualitative visibility — members see their rooms)
-- ---------------------------------------------------------------------------

drop policy if exists collector_rooms_select_member on public.collector_rooms;
create policy collector_rooms_select_member on public.collector_rooms
  for select to authenticated
  using (
    exists (
      select 1 from public.collector_room_members m
      where m.room_id = collector_rooms.room_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists collector_room_members_select_member on public.collector_room_members;
create policy collector_room_members_select_member on public.collector_room_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.collector_room_members self
      where self.room_id = collector_room_members.room_id
        and self.user_id = auth.uid()
    )
  );

grant select on public.collector_rooms to authenticated;
grant select on public.collector_room_members to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: presence churn keeps expired rooms cheap (no contextual join here)
-- ---------------------------------------------------------------------------

create or replace function public.trg_user_presence_dissolve_rooms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dissolve_expired_rooms();
  return new;
end;
$$;

drop trigger if exists user_presence_after_change_dissolve_rooms on public.user_presence;
create trigger user_presence_after_change_dissolve_rooms
after insert or update on public.user_presence
for each row execute function public.trg_user_presence_dissolve_rooms();

notify pgrst, 'reload schema';
