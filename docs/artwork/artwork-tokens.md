# Artwork tokens

Defined in `src/lib/ui/artwork-tokens.ts`.

## Grouped exports

- **`ARTWORK_TIER_STRIPS`** — `free`, `pro`, `elite` (paths under `/public/artwork/tier/`). Use **`getTierStripPath(slug)`** for slug normalization and unknown-tier fallback.
- **`ARTWORK_TEXTURES`** — `noise`, `paper`, `holoFoil`, `carbon`
- **`ARTWORK_MOTIFS`** — `circles`, `grid`, `dots`, `waves`
- **`ARTWORK_OVERLAYS`** — `scanlines`, `holoShine`, `softLight`
- **`ARTWORK_SILHOUETTES`** — `rounded`, `square`
- **`ARTWORK_BINDER`** — `rings`, `shadow`
- **`ARTWORK_CARD_FRAMES`** — `basic`, `holo`
- **`ARTWORK_SCANLINES`** — `vertical`, `horizontal`

## `getArtworkPath(key)`

Keys use **dotted names** that map to the groups above, for example:

- `textures.paper`
- `motifs.grid`
- `overlays.softLight`
- `binder.rings`
- `cards.basic`
- `scanlines.horizontal`

TypeScript type: `ArtworkKey`.

## Loader (`useArtwork.ts`)

- **`getArtworkPath(key)`** — Same as in `artwork-tokens.ts` (re-exported for a single import surface).
- **`preloadArtwork(keys)`** — Client-only; creates `Image()` instances to warm the cache. Safe to call from `useEffect` in a small client component.
