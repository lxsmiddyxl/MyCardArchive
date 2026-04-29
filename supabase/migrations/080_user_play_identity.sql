-- Decks & play identity: format/archetype preferences, deck stats mirror, play_identity badges + flair.
-- Catalog IDs must match `src/lib/play/formats-catalog.ts` and `src/lib/play/archetype-catalog.ts`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_play_identity (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  favorite_format_id text,
  favorite_archetype_id text,
  favorite_deck_name text,
  updated_at timestamptz not null default now()
);

comment on table public.user_play_identity is
  'Trainer play preferences (favorite format, archetype, deck label) for profile + social identity.';

create table if not exists public.user_deck_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  total_cards int not null default 0,
  unique_cards int not null default 0,
  last_updated timestamptz not null default now(),
  constraint user_deck_stats_user_deck_unique unique (user_id, deck_id)
);

create index if not exists user_deck_stats_user_id_idx on public.user_deck_stats (user_id, last_updated desc);

comment on table public.user_deck_stats is
  'Per-deck aggregates for identity badges and future “favorite deck” suggestions; synced from deck_cards.';

alter table public.user_play_identity enable row level security;
alter table public.user_deck_stats enable row level security;

drop policy if exists "user_play_identity_select_authenticated" on public.user_play_identity;
create policy "user_play_identity_select_authenticated"
  on public.user_play_identity for select to authenticated using (true);

drop policy if exists "user_play_identity_insert_own" on public.user_play_identity;
create policy "user_play_identity_insert_own"
  on public.user_play_identity for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_play_identity_update_own" on public.user_play_identity;
create policy "user_play_identity_update_own"
  on public.user_play_identity for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_deck_stats_select_own" on public.user_deck_stats;
create policy "user_deck_stats_select_own"
  on public.user_deck_stats for select to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.user_play_identity to authenticated;
grant select, insert, update, delete on table public.user_play_identity to service_role;

grant select on table public.user_deck_stats to authenticated;
grant all on table public.user_deck_stats to service_role;

-- ---------------------------------------------------------------------------
-- Sync user_deck_stats from deck_cards (SECURITY DEFINER — bypasses RLS)
-- ---------------------------------------------------------------------------

create or replace function public.sync_user_deck_stats_for_deck(p_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_total int;
  v_unique int;
begin
  if p_deck_id is null then
    return;
  end if;
  select d.user_id into v_user from public.decks d where d.id = p_deck_id;
  if v_user is null then
    return;
  end if;
  select count(*)::int, count(distinct card_id)::int into v_total, v_unique
  from public.deck_cards where deck_id = p_deck_id;
  insert into public.user_deck_stats (user_id, deck_id, total_cards, unique_cards, last_updated)
  values (v_user, p_deck_id, coalesce(v_total, 0), coalesce(v_unique, 0), now())
  on conflict (user_id, deck_id) do update set
    total_cards = excluded.total_cards,
    unique_cards = excluded.unique_cards,
    last_updated = excluded.last_updated;
  -- Badges refreshed by trigger `user_deck_stats_refresh_play_badges`.
end;
$$;

revoke all on function public.sync_user_deck_stats_for_deck(uuid) from public;
grant execute on function public.sync_user_deck_stats_for_deck(uuid) to service_role;

create or replace function public.trg_deck_cards_sync_user_deck_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_user_deck_stats_for_deck(coalesce(new.deck_id, old.deck_id));
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_deck_cards_sync_user_deck_stats() from public;

drop trigger if exists deck_cards_sync_user_deck_stats on public.deck_cards;
create trigger deck_cards_sync_user_deck_stats
  after insert or update or delete on public.deck_cards
  for each row execute function public.trg_deck_cards_sync_user_deck_stats();

create or replace function public.trg_decks_ai_sync_user_deck_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_user_deck_stats_for_deck(new.id);
  return new;
end;
$$;

revoke all on function public.trg_decks_ai_sync_user_deck_stats() from public;

drop trigger if exists decks_ai_sync_user_deck_stats on public.decks;
create trigger decks_ai_sync_user_deck_stats
  after insert on public.decks
  for each row execute function public.trg_decks_ai_sync_user_deck_stats();

-- ---------------------------------------------------------------------------
-- refresh_user_play_identity_badges
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_play_identity_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fmt text;
  v_arch text;
  v_deck_count int;
begin
  if p_user_id is null then
    return;
  end if;
  select
    lower(trim(p.favorite_format_id)),
    lower(trim(p.favorite_archetype_id))
  into v_fmt, v_arch
  from public.user_play_identity p
  where p.user_id = p_user_id;

  select count(distinct uds.deck_id)::int into v_deck_count
  from public.user_deck_stats uds
  where uds.user_id = p_user_id;

  if coalesce(v_fmt, '') = 'commander' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'play_identity', 'commander_enthusiast', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(v_arch, '') = 'control' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'play_identity', 'control_specialist', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(v_arch, '') = 'aggro' then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'play_identity', 'aggro_master', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(v_deck_count, 0) >= 3 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'play_identity', 'deckbuilder', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_play_identity_badges(uuid) from public;
grant execute on function public.refresh_user_play_identity_badges(uuid) to service_role;

create or replace function public.trg_user_deck_stats_refresh_play_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_play_identity_badges(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_user_deck_stats_refresh_play_badges() from public;

drop trigger if exists user_deck_stats_refresh_play_badges on public.user_deck_stats;
create trigger user_deck_stats_refresh_play_badges
  after insert or update on public.user_deck_stats
  for each row execute function public.trg_user_deck_stats_refresh_play_badges();

-- ---------------------------------------------------------------------------
-- RPCs: read + upsert + top decks
-- ---------------------------------------------------------------------------

create or replace function public.get_user_play_identity(p_user_id uuid)
returns table (
  favorite_format_id text,
  favorite_archetype_id text,
  favorite_deck_name text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.favorite_format_id,
    p.favorite_archetype_id,
    p.favorite_deck_name,
    p.updated_at
  from (select p_user_id as uid) x
  left join public.user_play_identity p on p.user_id = x.uid;
$$;

revoke all on function public.get_user_play_identity(uuid) from public;
grant execute on function public.get_user_play_identity(uuid) to authenticated;

create or replace function public.get_users_play_identity_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  favorite_format_id text,
  favorite_archetype_id text,
  favorite_deck_name text,
  deck_count_for_badges int,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    p.favorite_format_id,
    p.favorite_archetype_id,
    p.favorite_deck_name,
    coalesce((
      select count(distinct uds.deck_id)::int
      from public.user_deck_stats uds
      where uds.user_id = u.uid
    ), 0)::int,
    p.updated_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_play_identity p on p.user_id = u.uid;
$$;

revoke all on function public.get_users_play_identity_batch(uuid[]) from public;
grant execute on function public.get_users_play_identity_batch(uuid[]) to authenticated;

create or replace function public.upsert_user_play_identity(
  p_user_id uuid,
  p_format_id text,
  p_archetype_id text,
  p_deck_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fmt text;
  v_arch text;
  v_deck text;
begin
  if p_user_id is null or (select auth.uid()) is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_fmt := nullif(lower(trim(coalesce(p_format_id, ''))), '');
  v_arch := nullif(lower(trim(coalesce(p_archetype_id, ''))), '');
  v_deck := nullif(trim(coalesce(p_deck_name, '')), '');

  if v_fmt is not null and v_fmt not in (
    'standard', 'modern', 'commander', 'vintage', 'pioneer', 'pauper', 'legacy', 'limited'
  ) then
    v_fmt := null;
  end if;

  if v_arch is not null and v_arch not in (
    'aggro', 'control', 'midrange', 'combo', 'tribal', 'tempo', 'ramp', 'stax', 'burn'
  ) then
    v_arch := null;
  end if;

  insert into public.user_play_identity (user_id, favorite_format_id, favorite_archetype_id, favorite_deck_name, updated_at)
  values (p_user_id, v_fmt, v_arch, v_deck, now())
  on conflict (user_id) do update set
    favorite_format_id = excluded.favorite_format_id,
    favorite_archetype_id = excluded.favorite_archetype_id,
    favorite_deck_name = excluded.favorite_deck_name,
    updated_at = excluded.updated_at;

  perform public.refresh_user_play_identity_badges(p_user_id);
end;
$$;

revoke all on function public.upsert_user_play_identity(uuid, text, text, text) from public;
grant execute on function public.upsert_user_play_identity(uuid, text, text, text) to authenticated;

create or replace function public.get_user_top_deck_stats(p_user_id uuid)
returns table (
  deck_id uuid,
  deck_name text,
  total_cards int,
  unique_cards int,
  last_updated timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    uds.deck_id,
    d.name::text,
    uds.total_cards,
    uds.unique_cards,
    uds.last_updated
  from public.user_deck_stats uds
  join public.decks d on d.id = uds.deck_id
  where uds.user_id = p_user_id
  order by uds.total_cards desc, uds.unique_cards desc, uds.last_updated desc
  limit 12;
$$;

revoke all on function public.get_user_top_deck_stats(uuid) from public;
grant execute on function public.get_user_top_deck_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill user_deck_stats from existing decks
-- ---------------------------------------------------------------------------

insert into public.user_deck_stats (user_id, deck_id, total_cards, unique_cards, last_updated)
select
  d.user_id,
  d.id,
  coalesce((select count(*)::int from public.deck_cards dc where dc.deck_id = d.id), 0),
  coalesce((select count(distinct dc.card_id)::int from public.deck_cards dc where dc.deck_id = d.id), 0),
  now()
from public.decks d
on conflict (user_id, deck_id) do update set
  total_cards = excluded.total_cards,
  unique_cards = excluded.unique_cards,
  last_updated = excluded.last_updated;

-- ---------------------------------------------------------------------------
-- get_user_badges: play_identity after trade_reputation
-- ---------------------------------------------------------------------------

create or replace function public.get_user_badges(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  badge_type text,
  badge_key text,
  earned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.user_id, b.badge_type, b.badge_key, b.earned_at
  from public.user_badges b
  where b.user_id = p_user_id
  order by
    case b.badge_type
      when 'tier' then 0
      when 'tenure' then 1
      when 'scan_milestone' then 2
      when 'seasonal_event' then 3
      when 'journey' then 4
      when 'collection_mastery' then 5
      when 'trade_reputation' then 6
      when 'play_identity' then 7
      else 9
    end,
    case b.badge_type
      when 'scan_milestone' then
        case b.badge_key
          when 'scans_5000' then 5000
          when 'scans_1000' then 1000
          when 'scans_500' then 500
          when 'scans_100' then 100
          else 0
        end
      when 'seasonal_event' then
        case b.badge_key
          when 'holiday_2026_collector' then 3
          when 'summer_2026_scan_sprint' then 2
          when 'spring_2026_collector' then 1
          else 0
        end
      when 'journey' then
        case b.badge_key
          when 'journey_rep_1000' then 7
          when 'journey_first_seasonal' then 6
          when 'journey_ten_sets' then 5
          when 'journey_first_binder' then 4
          when 'journey_scan_500' then 3
          when 'journey_scan_50' then 2
          else 0
        end
      when 'collection_mastery' then
        case b.badge_key
          when 'cm_set_ten' then 12
          when 'cm_set_five' then 11
          when 'cm_set_first' then 10
          when 'cm_binder_ten' then 3
          when 'cm_binder_three' then 2
          when 'cm_binder_first' then 1
          else 0
        end
      when 'trade_reputation' then
        case b.badge_key
          when 'reliable_shop' then 3
          when 'veteran_trader' then 2
          when 'trusted_trader' then 1
          else 0
        end
      when 'play_identity' then
        case b.badge_key
          when 'commander_enthusiast' then 4
          when 'control_specialist' then 3
          when 'aggro_master' then 2
          when 'deckbuilder' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

do $bd$
declare
  r record;
begin
  for r in select distinct p.user_id from public.user_play_identity p loop
    perform public.refresh_user_play_identity_badges(r.user_id);
  end loop;
  for r in select distinct uds.user_id from public.user_deck_stats uds loop
    perform public.refresh_user_play_identity_badges(r.user_id);
  end loop;
end $bd$;

notify pgrst, 'reload schema';
