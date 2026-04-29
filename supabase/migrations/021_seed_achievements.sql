-- Seed achievements catalog (idempotent).
-- After this runs, apply 022 (category) and 023 (rarity) for full Achievements 2.0 columns.

insert into public.achievements (
  slug,
  title,
  description,
  icon,
  requirement_type,
  requirement_value
)
values
  ('first_binder', 'First Binder', 'Create your first binder', '📁', 'binder_count', 1),
  ('collector_5', 'Collector I', 'Create 5 binders', '📚', 'binder_count', 5),
  ('collector_10', 'Collector II', 'Create 10 binders', '🗂️', 'binder_count', 10),
  ('first_card', 'First Card', 'Add your first card', '🃏', 'card_count', 1),
  ('card_100', 'Card Hoarder', 'Add 100 cards', '🎴', 'card_count', 100),
  ('first_scan', 'First Scan', 'Scan your first card', '📸', 'scan_count', 1),
  ('scan_50', 'Scanner Pro', 'Scan 50 cards', '🔍', 'scan_count', 50)
on conflict (slug) do nothing;
