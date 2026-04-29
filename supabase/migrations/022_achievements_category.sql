-- Category labels for grouping achievements in the UI.

alter table public.achievements
  add column if not exists category text not null default 'Misc';

comment on column public.achievements.category is
  'UI grouping: Binders, Collection, Scanning, Decks (future), Misc.';

update public.achievements
set category = 'Binders'
where lower(requirement_type) = 'binder_count';

update public.achievements
set category = 'Collection'
where lower(requirement_type) = 'card_count';

update public.achievements
set category = 'Scanning'
where lower(requirement_type) = 'scan_count';

update public.achievements
set category = 'Decks (future)'
where lower(requirement_type) = 'deck_count';

-- Anything else (or legacy rows) stays Misc

notify pgrst, 'reload schema';
