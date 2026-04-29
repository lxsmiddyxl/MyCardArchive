# Creator tools (deck guides & collection showcases)

Phase **70** adds first-party creator surfaces backed by Supabase tables and app routes.

## Deck guides

- **Table** `deck_guides` — one row per deck (`deck_id` unique): `title`, `description`, **`highlights`** (`jsonb`, default `[]`).  
- **RLS** — Owners can CRUD their guides; other authenticated users can **read** guides for **public** decks (`decks.is_public`).  
- **UI** — `/guides` — pick a deck, edit title/description/highlights (one highlight per line stored as a JSON array).  
- **API** — `GET/POST /api/deck-guides`, `PATCH /api/deck-guides/[deckId]`.

### Telemetry

| Event | When |
|-------|------|
| `creator.deck_guide.create` | Successful `POST` creating a new guide. |

## Collection showcases

- **Table** `collection_showcases` — `title`, `description`, **`binder_ids`**, **`featured_card_ids`** (UUID arrays).  
- **RLS** — Any authenticated user can **read**; only the owner can insert/update/delete.  
- **UI** — `/showcase` — create and list showcases; `/showcase/[id]` — detail view.  
- **API** — `GET/POST /api/showcases`, `GET/PATCH /api/showcases/[id]`.

### Telemetry

| Event | When |
|-------|------|
| `creator.showcase.view` | Server render of `/showcase/[id]` for a signed-in viewer. |

See migration `051_creator_tools.sql`.
