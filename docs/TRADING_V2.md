# Trading negotiation v2 (Phase 53)

## UX additions

| Feature | Behavior |
|---------|----------|
| **Typing indicator** | While the message field changes, the client sends debounced **broadcast** events on `trade-negotiation:{tradeId}`. The partner sees “Partner is typing…”. |
| **Reviewing offer** | Interacting with an offer panel (pointer / focus) sends `reviewing_offer`; partner sees “Partner is reviewing your offer”. |
| **Offer updated** | When the trade’s `updatedAt` changes and you do **not** have a draft message, a banner confirms a fresh snapshot. |
| **Negotiation conflict** | If `updatedAt` changes while the message box is non-empty, a warning banner appears and `trade.negotiation.conflict` is logged (once per new `updatedAt`). |
| **Timeline** | Shows created time, last update (when different), and current status. |

## Realtime

- Negotiation hints use **Supabase Realtime broadcast** (`connectTradeNegotiationBroadcast` in `src/lib/trading/trade-broadcast.ts`), separate from Postgres trade subscriptions.
- Existing **presence** still drives “Partner viewing this trade”.

## Telemetry

| Event | Payload |
|-------|---------|
| `trade.timeline.event` | `tradeId`, `kinds` (`created`, `updated`, `status`) — emitted once per trade view. |
| `trade.negotiation.conflict` | `tradeId` when a draft message collides with a remote trade update. |

Existing `trade.action.success`, `trade.message.sent`, etc., are unchanged.

## Limitations

- Broadcast requires Realtime; if the channel fails to subscribe, typing/reviewing hints are skipped without blocking trading.
- True multi-user **operational transform** for simultaneous offer edits is not implemented; conflict detection focuses on **message draft vs. incoming trade row updates**.
