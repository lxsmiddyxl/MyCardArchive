# Marketplace foundations (Phase 57)

## Purpose

Non-transactional **discovery** for trades: collectors mark catalog-linked cards as **For trade** or **Looking for**, and the app exposes **aggregate** supply/demand plus **overlap hints** for potential matches.

## Schema

| Column (`cards`) | Meaning |
|------------------|---------|
| `for_trade` | This inventory row signals the catalog card is offered for trade. |
| `looking_for` | This row signals the collector wants that catalog card. |

Both default to `false`. Signals participate in discovery only when `catalog_card_id` is set (enforced in `PATCH /api/cards/[id]`).

Indexes (partial): `for_trade` / `looking_for` with non-null `catalog_card_id`.

## RPC: `get_market_discovery()`

Security definer function (authenticated only) returns JSON:

- `want_by_catalog`: grouped `looking_for` rows by `catalog_card_id` (card + collector counts).
- `offer_by_catalog`: grouped `for_trade` rows.
- `match_hints`: catalog ids where the current user’s flags complement another collector’s (`you_lf_they_ft`, `you_ft_they_lf`).

## API & UI

| Piece | Location |
|-------|----------|
| Discovery feed | `GET /api/market/discovery` → RPC |
| Browse UI | `/market` |
| Per-card flags | Card detail modal → `PATCH /api/cards/[id]` |

## Telemetry

| Event | When |
|-------|------|
| `market.flag.set` | Server: successful PATCH changing marketplace flags. |
| `market.browse` | Server: discovery API invoked. |
| `market.match.view` | Client: match hints present on marketplace page. |

## Limitations (v1)

- No in-app checkout or trade execution.
- Discovery is catalog-keyed; custom-only cards are excluded until linked.

---

## v2 — Watchlist & alerts (Phase 62)

### Tables

| Table | Purpose |
|-------|---------|
| `market_watchlist` | `(user_id, catalog_card_id)` — catalog cards to watch for **For trade** listings. |
| `market_alert_prefs` | Per-user toggles: `alert_ft_available`, `alert_trade_overlap`. |

### Triggers (in-app notifications)

- **`notify_market_watchlist_on_ft`** — When another user marks a **catalog-linked** card **For trade**, watchers of that `catalog_card_id` receive `market_watch_ft` (respects `alert_ft_available`).
- **`notify_trade_overlap_on_follow`** — On new `user_follows` row, if want/have overlap exists between follower and followee, both users may receive `market_trade_overlap` (respects `alert_trade_overlap`).

### API & UI

| Piece | Location |
|-------|----------|
| Watchlist CRUD | `GET` / `POST` / `DELETE` `/api/market/watchlist` |
| Alert preferences | `GET` / `PATCH` `/api/market/alert-prefs` |
| Watchlist + prefs UI | `/market` → `MarketWatchlistPanel` |

### Telemetry

| Event | When |
|-------|------|
| `market.watchlist.add` | Server: watchlist insert (deduped duplicate logged with `duplicate: true`). |
| `market.watchlist.remove` | Server: watchlist delete. |
| `market.alert.trigger` | Client: realtime `INSERT` on `notifications` with type `market_watch_ft` or `market_trade_overlap`. |

---

## v3 — Offers, counteroffers, negotiation (Phase 66)

Non-transactional **offer threads** between trainers: send, **counter**, or **decline**. Execution of trades still happens via the existing Trades flow.

### Tables

| Table | Purpose |
|-------|---------|
| `market_offers` | Threaded rows: `thread_id` (root = own `id`), `parent_offer_id`, `from_user_id`, `to_user_id`, optional `catalog_card_id`, `body`, `status` (`pending` / `countered` / `declined` / `withdrawn`). |
| `market_offer_events` | Append-only timeline: `created`, `countered`, `declined` (decline also updates the pending row). |

### API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/market/offers` | List threads the viewer participates in (grouped). |
| `POST` | `/api/market/offers` | New root offer `{ to_user_id, catalog_card_id?, body }`. |
| `GET` | `/api/market/offers/thread/[threadId]` | Offers + timeline events for a thread. |
| `POST` | `/api/market/offers/[offerId]/counter` | Recipient counters with `{ body }`. |
| `POST` | `/api/market/offers/[offerId]/decline` | Recipient declines a pending offer. |

### UI

| Piece | Location |
|-------|----------|
| Offers + thread timeline | `/market` → `MarketOffersPanel` |

### Telemetry

| Event | When |
|-------|------|
| `market.offer.sent` | Server: root offer created. |
| `market.offer.counter` | Server: counter-offer inserted. |
| `market.offer.decline` | Server: offer status set to `declined`. |

Migration: `048_marketplace_v3_offers.sql`.

---

## v4 — Structured offers + auto-matching (Phase 71)

### Structured payloads

Optional columns on `market_offers` (additive to v3):

| Column | Purpose |
|--------|---------|
| `items_offered` | JSON array of `{ catalog_card_id, qty }` lines you are putting on the table. |
| `items_requested` | JSON array of catalog lines you want from the counterparty. |
| `offer_notes` | Short freeform notes (works with `body`, which can be auto-summarized from structured lines). |
| `expires_at` | Optional non-binding expiration timestamp. |

### Auto-match engine

RPC **`get_market_auto_matches()`** returns JSON:

- **`reciprocal`** — pairs of collectors where your **Looking for** overlaps their **For trade** *and* vice versa on another catalog id (two-way swap hints).
- **`loops_3`** — best-effort directed **3-user trade loops** from FT/LF edges (same `catalog_card_id` bridge).

### API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/market/auto-match` | Runs `get_market_auto_matches()` for the signed-in user. |

### UI

| Piece | Location |
|-------|----------|
| Auto-match suggestions | `/market` → `MarketAutoMatchPanel` |
| Structured offer composer | `/market` → `MarketOffersPanel` |

### Telemetry

| Event | When |
|-------|------|
| `market.offer.structured` | Server: root offer or counter includes structured items, notes, or expiry. |
| `market.auto_match.trigger` | Server: `GET /api/market/auto-match` succeeds. |

Migrations: `052_marketplace_v4_structured_offers.sql`.

---

## v5 — Trade rooms + negotiation threads (Phase 76)

Structured **trade rooms** wrap each offer `thread_id`: the UI loads a single **trade room** payload (offers, timeline events, append-only **offer revisions**) instead of ad-hoc thread fetches.

### Tables

| Table | Purpose |
|-------|---------|
| `market_trade_rooms` | One row per thread: `thread_id` PK, `created_at` / `updated_at` (bumped on new offers and revisions). |
| `market_offer_revisions` | Append-only log: monotonic `seq` per thread, `offer_id`, `snapshot` JSON (`body`, structured items, notes, `expires_at`), `actor_id`. |

Database triggers on `market_offers` create/update the trade room row and append a revision on **insert** and on **in-place amend** when body/items/notes/expiry change.

### API & UI

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/market/trade-rooms/[threadId]` | Trade room: offers + events + revisions (+ telemetry `market.trade_room.open`). |
| `POST` | `/api/market/offers/[offerId]/revise` | Sender revises a **pending** offer (`body` and optional structured fields); DB trigger appends revision (`market.trade_room.revise`). |
| `GET` | `/api/market/catalog-preview?ids=` | Batch card metadata for inline previews in the offer panel. |

| Piece | Location |
|-------|----------|
| Expiry countdown | `OfferExpiryCountdown` |
| Inline catalog previews | `CatalogOfferPreviews` → catalog-preview API |
| Negotiation UI | `/market` → `MarketOffersPanel` (trade room header, revisions list, revise flow) |

Legacy `GET /api/market/offers/thread/[threadId]` may remain for older clients; the app uses **trade-rooms** for Phase 76.

### Telemetry

| Event | When |
|-------|------|
| `market.trade_room.open` | Server: trade room GET succeeds for a participant. |
| `market.trade_room.revise` | Server: pending offer revised by sender. |

Migration: `056_marketplace_v5_trade_rooms.sql`.
