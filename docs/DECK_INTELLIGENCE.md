# Deck intelligence (Phase 54)

## Behavior

The deck editor shows a **Deck intelligence (preview)** panel powered by `computeDeckMlIntelligence` (`src/lib/decks/ml-intelligence.ts`). It consumes the same aggregates already loaded for the editor (type spread, color tags, totals)—no extra network round trip.

Outputs:

- **Synergy score** — Heuristic 12–97 from type diversity and Trainer-like counts.
- **Suggested adds** — Short tips when Trainer density, Pokémon share, or Energy looks off relative to list size.
- **Weakness warnings** — Mono-type vulnerability hints using a simple type counter map; generic consistency warnings when Trainer count is low.

## Telemetry

| Event | Payload |
|-------|---------|
| `deck.ml.suggestions` | `deckId`, `count` (number of suggestion lines) |
| `deck.ml.synergy` | `deckId`, `score` |
| `deck.ml.weakness` | `deckId`, `count` (number of warnings) |

Events fire when the computed snapshot changes (deduped per unique suggestion/synergy/warning string).

## Future

Replace `computeDeckMlIntelligence` with a remote model endpoint while keeping the panel contract and telemetry names stable.
