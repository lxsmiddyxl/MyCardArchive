# Achievement badges (Phase 24)

## Files

All badges use **`viewBox="0 0 128 128"`** so they scale cleanly from favicon-size to large spotlight art.

## PNG export

1. Open any `.svg` in Figma, Illustrator, or Inkscape.
2. Set artboard / export size to target pixel width (**32**, **64**, **128**, **256**).
3. Export **PNG @1x** and **@2x** for raster contexts (email, social, App Store–style graphics).
4. Prefer **SVG on the web** for crisp scaling in React/Next.

## Color & theme

Badges use **fixed Tailwind-aligned hex** fills for metallic legibility on both **light** and **dark** UI backgrounds. When embedding inline, avoid double `filter: invert()` on parent containers.

## Typography

Numerals in milestone badges are **vector geometry** (no `<text>`) so exports are path-safe.

## Accessibility

Each badge root `<svg>` sets **`role="img"`** and **`aria-hidden="true"`** for decorative inline use. When a badge conveys status by itself, set **`aria-hidden="false"`** and **`aria-label`** from the product layer instead of embedding labels in the SVG.

## Theming

Standalone files use **fixed Tailwind-aligned hex** for contrast. To drive strokes from CSS, replace stroke hex values with **`currentColor`** in a duplicated asset or inline `<symbol>` wrapper where the app controls `color`.
