-- Collection value identity: conservative aggregates, grails, badges & flair.
-- Thresholds aligned with src/lib/value/value-identity-helpers.ts

-- ---------------------------------------------------------------------------
-- user_collection_value_cache
-- ---------------------------------------------------------------------------

create table if not exists public.user_collection_value_cache (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  estimated_value_cents bigint not null default 0,
  total_cards int not null default 0,
  unique_cards int not null default 0,
  high_rarity_count int not null default 0,
  last_refreshed_at timestamptz not null default now()
);

comment on table public.user_collection_value_cache is
  'Cached collection aggregates & conservative value estimates — refreshed server-side only.';

alter table public.user_collection_value_cache enable row level security;

drop policy if exists "user_collection_value_cache_select_own" on public.user_collection_value_cache;
create policy "user_collection_value_cache_select_own"
  on public.user_collection_value_cache for select to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.user_collection_value_cache to authenticated;
grant all on table public.user_collection_value_cache to service_role;

-- ---------------------------------------------------------------------------
-- user_grail_cards (card instance FK)
-- ---------------------------------------------------------------------------

create table if not exists public.user_grail_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  note text,
  added_at timestamptz not null default now(),
  constraint user_grail_cards_user_card_unique unique (user_id, card_id)
);

create index if not exists user_grail_cards_user_added_idx on public.user_grail_cards (user_id, added_at desc);

alter table public.user_grail_cards enable row level security;

drop policy if exists "user_grail_cards_own_all" on public.user_grail_cards;
create policy "user_grail_cards_own_all"
  on public.user_grail_cards for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.user_grail_cards to authenticated;
grant all on table public.user_grail_cards to service_role;

-- ---------------------------------------------------------------------------
-- Core refresh (no auth — triggers + service_role)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_collection_value_core(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_est bigint;
  v_total int;
  v_unique int;
  v_hi int;
begin
  if p_user_id is null then
    return;
  end if;

  select
    coalesce(sum(coalesce(lp.cents, 0)), 0)::bigint,
    count(*)::int,
    count(distinct coalesce(c.catalog_card_id::text, c.id::text))::int,
    coalesce(sum(
      case
        when lower(trim(coalesce(c.rarity, ''))) ~*
          'mythic|secret|illustration|rare ultra|collector|masterpiece|alternate|etched|gold|full art|borderless'
        then 1 else 0
      end
    ), 0)::int
  into v_est, v_total, v_unique, v_hi
  from public.cards c
  left join lateral (
    select round(coalesce(cp.market_price, 0) * 100)::bigint as cents
    from public.card_prices cp
    where cp.card_id = c.id
    order by cp.updated_at desc nulls last
    limit 1
  ) lp on true
  where c.user_id = p_user_id;

  insert into public.user_collection_value_cache (
    user_id,
    estimated_value_cents,
    total_cards,
    unique_cards,
    high_rarity_count,
    last_refreshed_at
  )
  values (p_user_id, coalesce(v_est, 0), coalesce(v_total, 0), coalesce(v_unique, 0), coalesce(v_hi, 0), now())
  on conflict (user_id) do update set
    estimated_value_cents = excluded.estimated_value_cents,
    total_cards = excluded.total_cards,
    unique_cards = excluded.unique_cards,
    high_rarity_count = excluded.high_rarity_count,
    last_refreshed_at = excluded.last_refreshed_at;

  perform public.refresh_user_collection_value_badges(p_user_id);
end;
$$;

revoke all on function public.refresh_user_collection_value_core(uuid) from public;
grant execute on function public.refresh_user_collection_value_core(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Badges (thresholds — see value-identity-helpers.ts)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_collection_value_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_user_id is null then
    return;
  end if;

  select *
  into r
  from public.user_collection_value_cache c
  where c.user_id = p_user_id;

  if not found then
    return;
  end if;

  -- ≥ $1,000 estimated (1_000 USD = 100_000 cents)
  if coalesce(r.estimated_value_cents, 0) >= 100000 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'collection_value', 'high_value_collector', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(r.high_rarity_count, 0) >= 25 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'collection_value', 'rarity_hunter', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;

  if coalesce(r.unique_cards, 0) >= 250 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'collection_value', 'unique_collector', now())
    on conflict on constraint user_badges_type_key_unique do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_user_collection_value_badges(uuid) from public;
grant execute on function public.refresh_user_collection_value_badges(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Authenticated self-refresh (optional manual / after import)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_my_collection_value()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform public.refresh_user_collection_value_core(uid);
end;
$$;

revoke all on function public.refresh_my_collection_value() from public;
grant execute on function public.refresh_my_collection_value() to authenticated;

-- Spec name: owner-only manual refresh (same as `refresh_my_collection_value`).
create or replace function public.refresh_user_collection_value(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.refresh_user_collection_value_core(p_user_id);
end;
$$;

revoke all on function public.refresh_user_collection_value(uuid) from public;
grant execute on function public.refresh_user_collection_value(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: cards
-- ---------------------------------------------------------------------------

create or replace function public.trg_cards_refresh_collection_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.user_id, old.user_id);
  if uid is null then
    return coalesce(new, old);
  end if;
  perform public.refresh_user_collection_value_core(uid);
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_cards_refresh_collection_value() from public;

drop trigger if exists cards_refresh_collection_value on public.cards;
create trigger cards_refresh_collection_value
  after insert or delete or update of rarity, catalog_card_id on public.cards
  for each row execute function public.trg_cards_refresh_collection_value();

-- ---------------------------------------------------------------------------
-- Trigger: card_prices (TODO: throttle in high-write environments)
-- ---------------------------------------------------------------------------

create or replace function public.trg_card_prices_refresh_collection_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cid uuid;
begin
  cid := coalesce(new.card_id, old.card_id);
  if cid is null then
    return coalesce(new, old);
  end if;
  select c.user_id into uid from public.cards c where c.id = cid limit 1;
  if uid is null then
    return coalesce(new, old);
  end if;
  perform public.refresh_user_collection_value_core(uid);
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_card_prices_refresh_collection_value() from public;

drop trigger if exists card_prices_refresh_collection_value on public.card_prices;
create trigger card_prices_refresh_collection_value
  after insert or update of market_price on public.card_prices
  for each row execute function public.trg_card_prices_refresh_collection_value();

-- ---------------------------------------------------------------------------
-- RPCs: read value + batch
-- ---------------------------------------------------------------------------

create or replace function public.get_user_collection_value(p_user_id uuid)
returns table (
  estimated_value_cents bigint,
  total_cards int,
  unique_cards int,
  high_rarity_count int,
  last_refreshed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(c.estimated_value_cents, 0)::bigint,
    coalesce(c.total_cards, 0)::int,
    coalesce(c.unique_cards, 0)::int,
    coalesce(c.high_rarity_count, 0)::int,
    c.last_refreshed_at
  from (select p_user_id as uid) x
  left join public.user_collection_value_cache c on c.user_id = x.uid;
$$;

revoke all on function public.get_user_collection_value(uuid) from public;
grant execute on function public.get_user_collection_value(uuid) to authenticated;

create or replace function public.get_users_collection_value_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  estimated_value_cents bigint,
  total_cards int,
  unique_cards int,
  high_rarity_count int,
  last_refreshed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid as user_id,
    coalesce(v.estimated_value_cents, 0)::bigint,
    coalesce(v.total_cards, 0)::int,
    coalesce(v.unique_cards, 0)::int,
    coalesce(v.high_rarity_count, 0)::int,
    v.last_refreshed_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_collection_value_cache v on v.user_id = u.uid;
$$;

revoke all on function public.get_users_collection_value_batch(uuid[]) from public;
grant execute on function public.get_users_collection_value_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Grail RPCs (definer — social read)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_grail_cards(p_user_id uuid)
returns table (
  card_id uuid,
  card_name text,
  note text,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.card_id, coalesce(c.name, 'Card')::text, g.note, g.added_at
  from public.user_grail_cards g
  join public.cards c on c.id = g.card_id
  where g.user_id = p_user_id
  order by g.added_at desc;
$$;

revoke all on function public.get_user_grail_cards(uuid) from public;
grant execute on function public.get_user_grail_cards(uuid) to authenticated;

create or replace function public.upsert_user_grail_card(p_user_id uuid, p_card_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cards c where c.id = p_card_id and c.user_id = p_user_id) then
    raise exception 'card not found' using errcode = 'P0002';
  end if;
  insert into public.user_grail_cards (user_id, card_id, note, added_at)
  values (p_user_id, p_card_id, nullif(trim(coalesce(p_note, '')), ''), now())
  on conflict (user_id, card_id) do update set note = excluded.note;
end;
$$;

revoke all on function public.upsert_user_grail_card(uuid, uuid, text) from public;
grant execute on function public.upsert_user_grail_card(uuid, uuid, text) to authenticated;

create or replace function public.delete_user_grail_card(p_user_id uuid, p_card_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.user_grail_cards g
  where g.user_id = p_user_id and g.card_id = p_card_id;
end;
$$;

revoke all on function public.delete_user_grail_card(uuid, uuid) from public;
grant execute on function public.delete_user_grail_card(uuid, uuid) to authenticated;

create or replace function public.get_users_grail_highlight_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  grail_count int,
  highlight_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    coalesce((
      select count(*)::int from public.user_grail_cards x where x.user_id = u.uid
    ), 0)::int,
    (
      select c.name::text
      from public.user_grail_cards g
      join public.cards c on c.id = g.card_id
      where g.user_id = u.uid
      order by g.added_at asc
      limit 1
    )
  from unnest(p_user_ids) as u(uid);
$$;

revoke all on function public.get_users_grail_highlight_batch(uuid[]) from public;
grant execute on function public.get_users_grail_highlight_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- One-time backfill (distinct card owners)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select distinct c.user_id from public.cards c loop
    begin
      perform public.refresh_user_collection_value_core(r.user_id);
    exception when others then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- get_user_badges: collection_value after play_identity
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
      when 'collection_value' then 8
      else 10
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
      when 'collection_value' then
        case b.badge_key
          when 'high_value_collector' then 3
          when 'rarity_hunter' then 2
          when 'unique_collector' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
