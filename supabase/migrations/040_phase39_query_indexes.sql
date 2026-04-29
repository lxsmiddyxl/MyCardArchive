-- Phase 39: composite indexes for common scoped lookups (IF NOT EXISTS for idempotency).

create index if not exists idx_cards_binder_user
  on public.cards (binder_id, user_id);

create index if not exists idx_decks_user_updated
  on public.decks (user_id, updated_at desc);
