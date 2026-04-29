-- Public deck sharing: is_public flag + read policies for shared decks (defense in depth with API).

alter table public.decks
  add column if not exists is_public boolean not null default false;

create index if not exists decks_is_public_idx on public.decks (is_public) where is_public = true;

-- Anyone can read decks marked public (API may use service role; this enables direct Supabase/PostgREST reads).
drop policy if exists "decks_select_public" on public.decks;
create policy "decks_select_public"
  on public.decks
  for select
  to anon, authenticated
  using (is_public = true);

grant select on table public.decks to anon;

-- Deck rows in public decks
drop policy if exists "deck_cards_select_public" on public.deck_cards;
create policy "deck_cards_select_public"
  on public.deck_cards
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_cards.deck_id
        and d.is_public = true
    )
  );

grant select on table public.deck_cards to anon;

-- deck_stats for public decks
drop policy if exists "deck_stats_select_public" on public.deck_stats;
create policy "deck_stats_select_public"
  on public.deck_stats
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_stats.deck_id
        and d.is_public = true
    )
  );

grant select on table public.deck_stats to anon;

-- Card columns visible through public deck composition (not full collection access).
drop policy if exists "cards_select_via_public_deck" on public.cards;
create policy "cards_select_via_public_deck"
  on public.cards
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.deck_cards dc
      join public.decks d on d.id = dc.deck_id
      where dc.card_id = cards.id
        and d.is_public = true
    )
  );

grant select on table public.cards to anon;

-- 404 vs 403 for anonymous API consumers (no service role required).
create or replace function public.get_public_deck_gate(p_deck_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public.decks d where d.id = p_deck_id) then
      jsonb_build_object('status', 'not_found')
    when not exists (
      select 1 from public.decks d where d.id = p_deck_id and coalesce(d.is_public, false)
    ) then
      jsonb_build_object('status', 'forbidden')
    else
      jsonb_build_object('status', 'ok')
  end;
$$;

grant execute on function public.get_public_deck_gate(uuid) to anon, authenticated;

-- Safe owner label for public decks only (does not leak names for private decks).
create or replace function public.get_public_deck_owner_display(p_deck_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text;
  v_email text;
begin
  if not exists (
    select 1 from public.decks d where d.id = p_deck_id and coalesce(d.is_public, false)
  ) then
    return null;
  end if;
  select p.username, p.email into v_username, v_email
  from public.decks d
  join public.profiles p on p.id = d.user_id
  where d.id = p_deck_id
  limit 1;
  if v_username is not null and length(trim(v_username)) > 0 then
    return trim(v_username);
  end if;
  if v_email is not null and length(trim(v_email)) > 0 then
    return split_part(trim(v_email), '@', 1);
  end if;
  return 'Anonymous';
end;
$$;

grant execute on function public.get_public_deck_owner_display(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
