-- Full-text search on user cards.name + RPC to distinguish 404 vs 403 for deck editor.

-- ---------------------------------------------------------------------------
-- 1. Generated tsvector for PostgREST .textSearch()
-- ---------------------------------------------------------------------------

alter table public.cards
  add column if not exists name_tsv tsvector
  generated always as (to_tsvector('english', coalesce(name, ''))) stored;

create index if not exists cards_name_tsv_idx on public.cards using gin (name_tsv);

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 2. Deck visibility (SECURITY DEFINER): found + is_owner for any deck id
-- ---------------------------------------------------------------------------

create or replace function public.get_deck_visibility(p_deck_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('found', false, 'is_owner', false);
  end if;

  select d.user_id into v_owner
  from public.decks d
  where d.id = p_deck_id;

  if v_owner is null then
    return jsonb_build_object('found', false, 'is_owner', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'is_owner', v_owner = v_uid
  );
end;
$$;

grant execute on function public.get_deck_visibility(uuid) to authenticated;

notify pgrst, 'reload schema';
