-- Draft trade rollback + CASCADE deletes: code calls DELETE on public.trades after a failed
-- trade_items insert (see src/lib/trading/db.ts). Without DELETE policies, rollback fails and
-- orphan draft trades remain. CASCADE also removes trade_items / trade_messages children.

-- ---------------------------------------------------------------------------
-- trades — creator may delete own draft rows only
-- ---------------------------------------------------------------------------

drop policy if exists "trades_delete_own_draft" on public.trades;

create policy "trades_delete_own_draft"
  on public.trades
  for delete
  to authenticated
  using (auth.uid() = created_by and status = 'draft');

grant delete on table public.trades to authenticated;

-- ---------------------------------------------------------------------------
-- trade_items — allow deletes while trade is still a draft (FK CASCADE from trades)
-- ---------------------------------------------------------------------------

drop policy if exists "trade_items_delete_draft_participant" on public.trade_items;

create policy "trade_items_delete_draft_participant"
  on public.trade_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.trades t
      where t.id = trade_items.trade_id
        and t.status = 'draft'
        and auth.uid() = t.created_by
    )
  );

grant delete on table public.trade_items to authenticated;

-- ---------------------------------------------------------------------------
-- trade_messages — same (CASCADE when draft trade is removed)
-- ---------------------------------------------------------------------------

drop policy if exists "trade_messages_delete_draft_creator" on public.trade_messages;

create policy "trade_messages_delete_draft_creator"
  on public.trade_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.trades t
      where t.id = trade_messages.trade_id
        and t.status = 'draft'
        and auth.uid() = t.created_by
    )
  );

grant delete on table public.trade_messages to authenticated;

-- ---------------------------------------------------------------------------
-- RLS intent (Phase 29): authenticated users only see and mutate rows tied to auth.uid().
-- Draft delete policies above exist so the app can roll back a draft trade without leaving
-- orphan trade_items / trade_messages after FK CASCADE from public.trades.
-- ---------------------------------------------------------------------------
