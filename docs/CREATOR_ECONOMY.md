# Creator economy v2 (monetizable guides + showcases)

Phase **75** layers **premium guide sections**, **featured cards** on showcases, and **analytics** counters.

## Schema (`055_creator_economy_v2.sql`)

### `deck_guides`

| Column | Purpose |
|--------|---------|
| `premium_sections` | JSON array of `{ title, body, locked? }` blocks for gated / monetizable content. |
| `analytics_views` | Server-incremented view counter. |
| `analytics_saves` | Reserved for bookmarks/saves. |

### `collection_showcases`

| Column | Purpose |
|--------|---------|
| `analytics_views` | Server-incremented views. |
| `analytics_saves` | Reserved. |

Existing **`featured_card_ids`** continues to power the featured-cards section on the showcase detail page.

## RPC

- **`increment_deck_guide_views(p_guide_id)`** — definer, increments when the viewer may read the guide (owner or public deck).
- **`increment_showcase_views(p_showcase_id)`** — definer, increments for authenticated viewers.

## API

| Route | Purpose |
|-------|---------|
| `POST /api/creator/analytics` | `{ kind: "deck_guide_view", guideId }` increments guide views. |
| `GET/PATCH /api/deck-guides` | Accepts `premium_sections` on create/update. |

## UI

- **`/guides`** — JSON editor for `premium_sections`, analytics display in the list, **Preview premium telemetry** button (client `creator.guide.premium_view`).

- **`/showcase/[id]`** — featured card links, server `increment_showcase_views`, telemetry `creator.showcase.featured` when featured ids exist.



## Telemetry



| Event | When |

|-------|------|

| `creator.guide.premium_view` | Client: user taps premium preview on a saved guide. |

| `creator.showcase.featured` | Server: showcase detail has at least one featured card id. |

