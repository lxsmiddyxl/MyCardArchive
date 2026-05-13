-- Phase 39 (hardening): composite list indexes for trades and binders (common sort: updated_at / created_at desc).

create index if not exists idx_trades_created_by_updated_at
  on public.trades (created_by, updated_at desc);

create index if not exists idx_trades_counterparty_updated_at
  on public.trades (counterparty_id, updated_at desc);

create index if not exists idx_binders_user_created_at
  on public.binders (user_id, created_at desc);

comment on index idx_trades_created_by_updated_at is 'Creator trade inbox ordering by recency.';
comment on index idx_trades_counterparty_updated_at is 'Counterparty trade inbox ordering by recency.';
comment on index idx_binders_user_created_at is 'Binder shelf list per user ordered by created_at.';
