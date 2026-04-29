# Mobile readiness (Phase 58)

## Principles

- Touch targets **≥ 44px** where possible on primary actions (buttons, nav controls).
- **Responsive grids** stack to single column below `md` for dense tools (marketplace, matching, binders).
- **Motion**: `duration-200` + `ease-mca-standard` for drawers and overlays (see global tokens).
- **Gestures**: long-press is reserved for secondary actions / power-user shortcuts; swipe patterns should not replace primary navigation.

## Surfaces reviewed / tuned

| Surface | Notes |
|---------|--------|
| **Binder** | Binder pages use scrollable layouts; mobile nav opens full-height drawer (`MobileNavDrawer`). |
| **Deck editor** | Deck flows live under `/decks`; prefer stacked controls on narrow viewports. |
| **Trade detail** | Trade routes use `Panel` + monospace metadata; confirm horizontal scroll for IDs on small screens. |
| **Matching** | Matching dashboard uses responsive flex/grid; tables should wrap or scroll. |
| **Scan → grading** | Scan page is touch-first; grading modal is scrollable with lazy sections. |

## Telemetry

| Event | When |
|-------|------|
| `mobile.layout.switch` | Mobile nav drawer opened or primary mobile layout toggled. |
| `mobile.interaction` | Long-press or other gesture helper fires (includes `kind`). |

## Follow-ups

- Virtualized lists on low-end devices for very large binders.
- Optional bottom tab bar experiment (behind feature flag / experiments).

---

## v2 — Gestures, offline queue, speed (Phase 64)

### Gestures

- **Binder**: `BinderSlotCell` + `SwipeRevealActions` — swipe from the **left edge** of a slot to reveal **Open** / **Slot** actions; **long-press** on a card opens the card detail and logs `mobile.gesture` (`long_press_card`, binder surface).
- **Deck editor**: zone rows use `SwipeRevealActions` with **Open** / **−1** behind the row (same edge-swipe pattern). **Long-press** the card title row to open card detail and emit `mobile.gesture` (`long_press_card`, deck surface).

### Offline-first queue (localStorage)

`src/lib/mobile/offline-action-queue.ts` stores queued work when the network is unavailable or fetch fails in a way that looks offline:

| Kind | Behavior |
|------|----------|
| `trade_message` | Queued on trade send failure; flushed on load + `online` via `POST /api/trades/:id/messages`. |
| `binder_slot_move` | Queued on slot move failure; retried on `online` against `/api/binders/:id/slots/move`. |
| `card_market_flags` | Queued when marketplace PATCH fails offline (user message; manual retry sync). |
| `deck_zone_change` | Queued for add/remove/move; retried on `online` against deck card APIs. |

### Telemetry

| Event | When |
|-------|------|
| `mobile.gesture` | Swipe reveal open/close, long-press card (binder). |
| `mobile.offline.queue` | Enqueue and successful flush of queued actions (see `enqueueOfflineAction` / flush paths). |
