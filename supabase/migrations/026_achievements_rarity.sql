-- Achievement rarity for UI (common / rare / legendary).

alter table public.achievements
  add column if not exists rarity text not null default 'common';

update public.achievements
set rarity = 'common'
where slug in ('first_binder', 'first_card', 'first_scan');

update public.achievements
set rarity = 'rare'
where slug in ('collector_5', 'collector_10', 'scan_50');

update public.achievements
set rarity = 'legendary'
where slug = 'card_100';

update public.achievements
set rarity = lower(trim(rarity));

update public.achievements
set rarity = 'common'
where rarity not in ('common', 'rare', 'legendary');

alter table public.achievements
  drop constraint if exists achievements_rarity_check;

alter table public.achievements
  add constraint achievements_rarity_check
  check (rarity in ('common', 'rare', 'legendary'));

comment on column public.achievements.rarity is
  'Display tier: common, rare, legendary.';

notify pgrst, 'reload schema';
