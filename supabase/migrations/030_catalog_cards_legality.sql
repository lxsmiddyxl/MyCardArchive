-- Per-format legality flags on catalog cards (defaults assume legal until curated otherwise).

alter table public.catalog_cards
  add column if not exists legal_standard boolean not null default true;

alter table public.catalog_cards
  add column if not exists legal_expanded boolean not null default true;

alter table public.catalog_cards
  add column if not exists legal_unlimited boolean not null default true;

alter table public.catalog_cards
  add column if not exists legal_commander boolean not null default true;

notify pgrst, 'reload schema';
