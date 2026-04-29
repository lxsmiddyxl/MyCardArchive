# User flows (reference)

High-level journeys the app is built around. Routes are indicative; exact URLs follow App Router segments.

## Collection & inventory

1. **Browse inventory** — `/cards` (or dashboard entry) to search and open card detail.
2. **Add or edit a card** — From binder add-card, scan, or inventory actions; persists via `/api/cards` patterns.
3. **Open card detail** — Modal or page: pricing, legality, grading, deck locations.

## Binders

1. **List binders** — `/binders`.
2. **Create binder** — `/binders/create`; name and layout.
3. **Binder book** — `/binders/[binderId]`: page turns, slot assignment, drag/drop or picker, card detail modal.

## Decks

1. **List decks** — `/decks`.
2. **Edit deck** — `/decks/[deckId]`: catalog search, zones (main / side / commander), import/export, legality and stats.

## Scan → match → add

1. **Scan** — `/scan`: upload image, optional binder selection, run scan.
2. **Review AI + auto-match** — Results panel; link to add-card with query params when a binder is chosen.
3. **Add card** — `/binders/[binderId]/add-card` pre-filled from scan.

## Grading

1. From **card detail**, open grading section; run analysis (POST `/api/cards/[id]/grade`).
2. Review overlays (centering, corners, surface, edges) in the grading panel.

## Trades

1. **Trades hub** — `/trades`: list and status.
2. **New trade** — `/trades/new`: pick partner and lines.
3. **Trade detail** — `/trades/[tradeId]`: messages, status actions, offer panels.

## Matching & discovery

1. **Matching** — `/matching`: suggested exchanges and discovery feed (virtualized when lists are long).

## Account & tier

1. **Tier / membership** — `/tier` for plan context.
2. **Notifications / activity** — `/notifications`, `/activity` for system and social signals.
