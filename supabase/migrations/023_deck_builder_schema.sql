-- Deck builder: decks, deck_cards, deck_stats, RLS, triggers, tier limits.

-- ---------------------------------------------------------------------------
-- 1. decks
-- ---------------------------------------------------------------------------

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  format text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_user_id_idx on public.decks (user_id);
create index decks_created_at_idx on public.decks (created_at desc);

alter table public.decks enable row level security;

create policy "decks_select_own"
  on public.decks
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "decks_insert_own"
  on public.decks
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "decks_update_own"
  on public.decks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "decks_delete_own"
  on public.decks
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on table public.decks to authenticated;

-- ---------------------------------------------------------------------------
-- 2. deck_cards
-- ---------------------------------------------------------------------------

create table public.deck_cards (
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity int not null default 1,
  section text not null default 'main',
  primary key (deck_id, card_id, section)
);

create index deck_cards_deck_id_idx on public.deck_cards (deck_id);
create index deck_cards_card_id_idx on public.deck_cards (card_id);

alter table public.deck_cards enable row level security;

create policy "deck_cards_select_own"
  on public.deck_cards
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.user_id = auth.uid()
    )
  );

create policy "deck_cards_insert_own"
  on public.deck_cards
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.user_id = auth.uid()
    )
  );

create policy "deck_cards_update_own"
  on public.deck_cards
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.user_id = auth.uid()
    )
  );

create policy "deck_cards_delete_own"
  on public.deck_cards
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.deck_cards to authenticated;

-- ---------------------------------------------------------------------------
-- 3. deck_stats
-- ---------------------------------------------------------------------------

create table public.deck_stats (
  deck_id uuid primary key references public.decks (id) on delete cascade,
  total_cards int not null default 0,
  unique_cards int not null default 0,
  color_identity text[] not null default array[]::text[],
  synergy_score int not null default 0,
  legality_status text not null default 'unknown',
  updated_at timestamptz not null default now()
);

alter table public.deck_stats enable row level security;

create policy "deck_stats_select_own"
  on public.deck_stats
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_stats.deck_id
        and d.user_id = auth.uid()
    )
  );

create policy "deck_stats_update_own"
  on public.deck_stats
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_stats.deck_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decks d
      where d.id = deck_stats.deck_id
        and d.user_id = auth.uid()
    )
  );

grant select, update on table public.deck_stats to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row
  execute function public.set_updated_at();

create or replace function public.trg_decks_after_insert_deck_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deck_stats (deck_id)
  values (NEW.id);
  return NEW;
end;
$$;

drop trigger if exists decks_after_insert_deck_stats on public.decks;
create trigger decks_after_insert_deck_stats
  after insert on public.decks
  for each row
  execute function public.trg_decks_after_insert_deck_stats();

-- ---------------------------------------------------------------------------
-- 5. Tier deck limits (BEFORE INSERT)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_deck_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_slug text;
  v_max int;
begin
  select count(*)::int
    into v_count
  from public.decks
  where user_id = NEW.user_id;

  select ut.tier_slug
    into v_slug
  from public.user_tiers ut
  where ut.user_id = NEW.user_id
  limit 1;

  v_slug := lower(trim(coalesce(v_slug, 'free')));

  if v_slug = 'elite' then
    return NEW;
  end if;

  v_max := case v_slug
    when 'pro' then 10
    else 1
  end;

  if v_count >= v_max then
    raise exception 'Deck limit reached for your tier.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists decks_enforce_tier_limit on public.decks;
create trigger decks_enforce_tier_limit
  before insert on public.decks
  for each row
  execute function public.enforce_deck_limit();

notify pgrst, 'reload schema';
