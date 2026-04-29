# Artwork overview (Phase 23)

MyCardArchive ships a **core UI artwork pack** under `/public/artwork/core/`: textures, motifs, overlays, silhouettes, binder chrome, card frames, and scanlines. Assets are referenced through **tokens** in `src/lib/ui/artwork-tokens.ts` so URLs stay stable when files are swapped for higher-fidelity art later.

## Principles

- **Tokenized paths** — Use `getArtworkPath()` or the grouped exports (`ARTWORK_TEXTURES`, `ARTWORK_MOTIFS`, etc.); avoid hard-coding `/artwork/...` in feature code when adding new surfaces.
- **Non-breaking** — Phase 23 adds layers and backgrounds only; it does not change data loading, tiers, trades, or catalog rules.
- **Tier-specific backgrounds** — Deferred to **Phase 25**. The Tier page includes a small **wave motif strip** as a placeholder only.
- **Marketing / OG** — Deferred to **Phase 24**.

## Where it appears

| Surface | Treatment |
|--------|------------|
| Dashboard hero | Grid motif + soft-light overlay |
| Binder list & binder detail | Paper texture shell; rings behind the title |
| Catalog card detail | Basic frame SVG; holo shine on hover |
| Loading skeletons | Horizontal scanline texture via `globals.css` on `.mca-skeleton-shimmer` |
| Tier page | Wave motif strip (placeholder) |

## Preloading

`preloadArtwork()` (in `src/lib/ui/useArtwork.ts`) warms the image cache on the client. The dashboard mounts `ArtworkWarmDashboard` to preload common textures and motifs after navigation.
