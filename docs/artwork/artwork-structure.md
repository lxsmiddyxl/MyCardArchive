# Artwork directory structure

```
public/artwork/core/
├── textures/
│   ├── texture-noise.png
│   ├── texture-paper.png
│   ├── texture-holo-foil.png
│   └── texture-carbon.png
├── motifs/
│   ├── motif-circles.svg
│   ├── motif-grid.svg
│   ├── motif-dots.svg
│   └── motif-waves.svg
├── overlays/
│   ├── overlay-scanlines.png
│   ├── overlay-holo-shine.png
│   └── overlay-soft-light.png
├── silhouettes/
│   ├── card-silhouette-rounded.svg
│   └── card-silhouette-square.svg
├── binder/
│   ├── binder-rings.svg
│   └── binder-shadow.png
├── cards/
│   ├── card-frame-basic.svg
│   └── card-frame-holo.svg
└── scanlines/
    ├── scanline-vertical.png
    └── scanline-horizontal.png
```

Phase 23 uses **placeholder** raster files (minimal PNG) where a bitmap is required; replace with production art without renaming paths if possible, or update `artwork-tokens.ts` in one place.

Presentation components live under `src/components/artwork/` (for example `artwork-surfaces.tsx`, `binder-title-artwork.tsx`, `catalog-card-artwork-panel.tsx`).
