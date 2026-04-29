-- Phase 43: composite index for deck zone reads (deck_id + section).

create index if not exists idx_deck_cards_deck_section
  on public.deck_cards (deck_id, section);
