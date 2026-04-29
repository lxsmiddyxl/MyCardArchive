-- App expects public.cards.name, set_name, rarity (see CardForm / binder views).
-- Some projects used `title` only; PostgREST then errors on .select("name") / insert { name }.
-- Backfill and reload API schema cache.

alter table public.cards add column if not exists name text;
alter table public.cards add column if not exists set_name text;
alter table public.cards add column if not exists rarity text;

-- Legacy DBs may have `title` instead of `name`; fresh resets do not.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name = 'title'
  ) then
    update public.cards
    set name = coalesce(
      nullif(trim(name), ''),
      nullif(trim(title), ''),
      'Untitled'
    )
    where name is null or trim(name) = '';
  else
    update public.cards
    set name = coalesce(nullif(trim(name), ''), 'Untitled')
    where name is null or trim(name) = '';
  end if;
end $$;

alter table public.cards alter column name set not null;

notify pgrst, 'reload schema';
