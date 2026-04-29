# Empty-state illustrations (Phase 28)

## Layout

All assets use **`viewBox="0 0 400 220"`** and **`rx="28"`** on the canvas so they align in grids and scale from ~**240px**–**480px** wide containers.

## Theming

Wireframes use **`stroke="currentColor"`** / **`fill` with `currentColor`** where noted; the root **`<svg color="#71717a">`** sets a zinc default. When inlining SVG in React, set `className="text-zinc-500"` (or similar) on the wrapper so strokes track the theme.

Accent colors (emerald, amber) remain **fixed hex** for predictable contrast on dark surfaces.

## PNG export

1. Open any `.svg` in Figma, Illustrator, or Inkscape.  
2. Export at **800×440** (@2x) or **400×220** (@1x) if a raster fallback is required.  
3. Prefer **SVG** in the app.

## Shadows

Only **`empty-no-decks.svg`** uses a single subtle **`feDropShadow`** for stacked depth, per Phase 28 art direction.
