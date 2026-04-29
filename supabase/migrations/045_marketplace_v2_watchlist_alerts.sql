-- Phase 62: Marketplace v2 — watchlist + alert preferences + in-app notifications.

-- ---------------------------------------------------------------------------
-- market_watchlist — catalog cards the user wants alerts for
-- ---------------------------------------------------------------------------

create table public.market_watchlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  catalog_card_id text not null references public.catalog_cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, catalog_card_id)
);

create index market_watchlist_catalog_card_id_idx on public.market_watchlist (catalog_card_id);

comment on table public.market_watchlist is 'User watchlist for marketplace catalog cards (FT alerts).';

alter table public.market_watchlist enable row level security;

create policy "market_watchlist_select_own"
  on public.market_watchlist for select to authenticated
  using (auth.uid() = user_id);

create policy "market_watchlist_insert_own"
  on public.market_watchlist for insert to authenticated
  with check (auth.uid() = user_id);

create policy "market_watchlist_delete_own"
  on public.market_watchlist for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.market_watchlist to authenticated;

-- ---------------------------------------------------------------------------
-- market_alert_prefs — per-user toggles for marketplace notifications
-- ---------------------------------------------------------------------------

create table public.market_alert_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  alert_ft_available boolean not null default true,
  alert_trade_overlap boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.market_alert_prefs is 'Marketplace notification preferences.';

alter table public.market_alert_prefs enable row level security;

create policy "market_alert_prefs_select_own"
  on public.market_alert_prefs for select to authenticated
  using (auth.uid() = user_id);

create policy "market_alert_prefs_upsert_own"
  on public.market_alert_prefs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "market_alert_prefs_update_own"
  on public.market_alert_prefs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.market_alert_prefs to authenticated;

-- ---------------------------------------------------------------------------
-- Notify watchers when a card is marked For trade
-- ---------------------------------------------------------------------------

create or replace function public.notify_market_watchlist_on_ft()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.catalog_card_id is null or new.for_trade is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.for_trade, false) then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, trade_id)
  select
    w.user_id,
    'market_watch_ft',
    'Watched card listed for trade',
    'A catalog card on your watchlist is now marked For trade.',
    null
  from public.market_watchlist w
  where w.catalog_card_id = new.catalog_card_id
    and w.user_id <> new.user_id
    and coalesce(
      (select p.alert_ft_available from public.market_alert_prefs p where p.user_id = w.user_id),
      true
    ) = true;

  return new;
end;
$$;

drop trigger if exists trg_cards_market_watchlist_notify on public.cards;
create trigger trg_cards_market_watchlist_notify
  after insert or update of for_trade, catalog_card_id on public.cards
  for each row
  execute function public.notify_market_watchlist_on_ft();

-- ---------------------------------------------------------------------------
-- Notify on new follow when want/have overlap exists (trade partner signal)
-- ---------------------------------------------------------------------------

create or replace function public.notify_trade_overlap_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt integer;
begin
  select count(*)::integer into cnt
  from (
    select w.card_id
    from public.user_wantlist_index w
    inner join public.user_havelist_index h on w.card_id = h.card_id
    where w.user_id = new.follower_id and h.user_id = new.following_id
    union
    select w.card_id
    from public.user_wantlist_index w
    inner join public.user_havelist_index h on w.card_id = h.card_id
    where w.user_id = new.following_id and h.user_id = new.follower_id
  ) x;

  if cnt < 1 then
    return new;
  end if;

  if coalesce(
    (select p.alert_trade_overlap from public.market_alert_prefs p where p.user_id = new.follower_id),
    true
  ) then
    insert into public.notifications (user_id, type, title, body, trade_id)
    values (
      new.follower_id,
      'market_trade_overlap',
      'Trade overlap with a trainer you follow',
      'You follow someone whose haves/wants overlap with yours — good time to start a trade.',
      null
    );
  end if;

  if coalesce(
    (select p.alert_trade_overlap from public.market_alert_prefs p where p.user_id = new.following_id),
    true
  ) then
    insert into public.notifications (user_id, type, title, body, trade_id)
    values (
      new.following_id,
      'market_trade_overlap',
      'Trade overlap with a new follower',
      'A new follower has overlapping want/have cards with you.',
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_follows_trade_overlap on public.user_follows;
create trigger trg_user_follows_trade_overlap
  after insert on public.user_follows
  for each row
  execute function public.notify_trade_overlap_on_follow();
