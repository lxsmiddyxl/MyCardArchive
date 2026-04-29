-- Presence & coarse activity signals — updated via touch_user_presence (server-side triggers + optional RPC).

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_activity text,
  last_activity_at timestamptz,
  presence_opt_out boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.user_presence is
  'Last-seen + coarse activity labels — read via RPC batch only; no raw timestamps in UI.';

create index if not exists user_presence_last_seen_idx on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

revoke all on table public.user_presence from public;
revoke all on table public.user_presence from anon;
revoke all on table public.user_presence from authenticated;

grant all on table public.user_presence to service_role;

-- Optional realtime fan-out (RLS allows authenticated SELECT for postgres_changes subscribers).
drop policy if exists "user_presence_select_authenticated" on public.user_presence;
create policy "user_presence_select_authenticated"
  on public.user_presence for select to authenticated using (true);

grant select on table public.user_presence to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.user_presence;
exception
  when duplicate_object then null;
end $$;

create or replace function public.touch_user_presence(p_user_id uuid, p_activity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_act text;
begin
  if p_user_id is null then
    return;
  end if;

  if exists (select 1 from public.user_presence up where up.user_id = p_user_id and up.presence_opt_out) then
    return;
  end if;

  v_act := nullif(trim(coalesce(p_activity, '')), '');
  if v_act is not null and v_act not in (
    'scanning', 'deck_building', 'binder_editing', 'browsing_sets', 'commenting', 'liking'
  ) then
    v_act := null;
  end if;

  insert into public.user_presence (user_id, last_seen_at, last_activity, last_activity_at, updated_at)
  values (
    p_user_id,
    v_now,
    case when v_act is null then null else v_act end,
    case when v_act is null then null else v_now end,
    v_now
  )
  on conflict (user_id) do update set
    last_seen_at = v_now,
    last_activity = case
      when v_act is null then public.user_presence.last_activity
      when public.user_presence.last_activity_at is null
        or v_now - public.user_presence.last_activity_at >= interval '10 seconds'
        or coalesce(public.user_presence.last_activity, '') is distinct from v_act
      then v_act
      else public.user_presence.last_activity
    end,
    last_activity_at = case
      when v_act is null then public.user_presence.last_activity_at
      when public.user_presence.last_activity_at is null
        or v_now - public.user_presence.last_activity_at >= interval '10 seconds'
        or coalesce(public.user_presence.last_activity, '') is distinct from v_act
      then v_now
      else public.user_presence.last_activity_at
    end,
    updated_at = v_now;
end;
$$;

revoke all on function public.touch_user_presence(uuid, text) from public;

create or replace function public.update_user_presence(p_user_id uuid, p_activity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;
  perform public.touch_user_presence(p_user_id, p_activity);
end;
$$;

revoke all on function public.update_user_presence(uuid, text) from public;
grant execute on function public.update_user_presence(uuid, text) to authenticated;

grant execute on function public.touch_user_presence(uuid, text) to service_role;

create or replace function public.get_user_presence(p_user_id uuid)
returns table (
  user_id uuid,
  last_seen_at timestamptz,
  last_activity text,
  last_activity_at timestamptz,
  presence_opt_out boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    case when p.presence_opt_out then null else p.last_seen_at end,
    case when p.presence_opt_out then null else p.last_activity end,
    case when p.presence_opt_out then null else p.last_activity_at end,
    p.presence_opt_out,
    p.updated_at
  from public.user_presence p
  where p.user_id = p_user_id;
$$;

revoke all on function public.get_user_presence(uuid) from public;
grant execute on function public.get_user_presence(uuid) to authenticated;

create or replace function public.get_users_presence_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  last_seen_at timestamptz,
  last_activity text,
  last_activity_at timestamptz,
  presence_opt_out boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    case when p.presence_opt_out then null else p.last_seen_at end,
    case when p.presence_opt_out then null else p.last_activity end,
    case when p.presence_opt_out then null else p.last_activity_at end,
    coalesce(p.presence_opt_out, false),
    coalesce(p.updated_at, now())
  from unnest(p_user_ids) as u(uid)
  left join public.user_presence p on p.user_id = u.uid;
$$;

revoke all on function public.get_users_presence_batch(uuid[]) from public;
grant execute on function public.get_users_presence_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers → touch_user_presence (SECURITY DEFINER touch grants bypass RLS)
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_presence_from_scan_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_user_presence(new.user_id, 'scanning');
  return new;
end;
$$;

drop trigger if exists tr_presence_scan_events on public.scan_events;
create trigger tr_presence_scan_events
  after insert on public.scan_events
  for each row execute function public.tr_user_presence_from_scan_events();

create or replace function public.tr_user_presence_from_deck_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck uuid;
  v_uid uuid;
begin
  v_deck := coalesce(new.deck_id, old.deck_id);
  if v_deck is null then
    return coalesce(new, old);
  end if;
  select d.user_id into v_uid from public.decks d where d.id = v_deck;
  if v_uid is not null then
    perform public.touch_user_presence(v_uid, 'deck_building');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_presence_deck_cards on public.deck_cards;
create trigger tr_presence_deck_cards
  after insert or update or delete on public.deck_cards
  for each row execute function public.tr_user_presence_from_deck_cards();

create or replace function public.tr_user_presence_from_binder_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_binder uuid;
  v_uid uuid;
begin
  v_binder := coalesce(new.binder_id, old.binder_id);
  if v_binder is null then
    return coalesce(new, old);
  end if;
  select b.user_id into v_uid from public.binders b where b.id = v_binder;
  if v_uid is not null then
    perform public.touch_user_presence(v_uid, 'binder_editing');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_presence_binder_slots on public.binder_slots;
create trigger tr_presence_binder_slots
  after insert or update or delete on public.binder_slots
  for each row execute function public.tr_user_presence_from_binder_slots();

create or replace function public.tr_user_presence_from_community_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_user_presence(new.author_id, 'commenting');
  return new;
end;
$$;

drop trigger if exists tr_presence_community_posts on public.community_posts;
create trigger tr_presence_community_posts
  after insert on public.community_posts
  for each row execute function public.tr_user_presence_from_community_posts();

create or replace function public.tr_user_presence_from_community_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_user_presence(new.author_id, 'commenting');
  return new;
end;
$$;

drop trigger if exists tr_presence_community_comments on public.community_post_comments;
create trigger tr_presence_community_comments
  after insert on public.community_post_comments
  for each row execute function public.tr_user_presence_from_community_comments();

create or replace function public.tr_user_presence_from_community_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_user_presence(new.user_id, 'liking');
  return new;
end;
$$;

drop trigger if exists tr_presence_community_likes on public.community_post_likes;
create trigger tr_presence_community_likes
  after insert on public.community_post_likes
  for each row execute function public.tr_user_presence_from_community_likes();
