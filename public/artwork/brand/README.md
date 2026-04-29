# MyCardArchive — Brand export pack (Phase 30)

Vector-first brand surfaces aligned with `ARTWORK_STYLE_GUIDE.md`, Phase 25 marketing / OG layouts, and Phases 23–29 geometry. **No typography is embedded** in SVGs (only `<title>` for accessibility); place the product wordmark beside lockups in Figma / Sketch / Canva using your licensed fonts.

## PNG export matrix

| Asset | Native `viewBox` | Typical PNG export |
|-------|------------------|-------------------|
| `brand-social-twitter.svg` | 1500×500 | **1500×500** (X / Twitter header) |
| `brand-social-facebook.svg` | 1200×630 | **1200×630** (Facebook / Meta preview parity with OG) |
| `brand-social-linkedin.svg` | 1128×191 | **1128×191** (LinkedIn cover) |
| `brand-social-youtube.svg` | 2560×1440 | **2560×1440** min (YouTube channel art) |
| `brand-logo-lockup.svg` | 960×240 | **1920×480** @2x for print / deck |
| `brand-logo-lockup-vertical.svg` | 420×560 | **840×1120** @2x |
| `brand-badge.svg` | 512×512 | **1024×1024** @2x (square emblem) |
| `brand-watermark.svg` | 800×800 | **1600×1600** @2x for slides |
| `brand-appstore-hero.svg` | 4320×1080 | **4320×1080** or scale to storefront specs |
| `brand-appstore-feature.svg` | 1024×500 | **2048×1000** @2x |
| `brand-appstore-icon.svg` | 1024×1024 | **1024×1024** (App Store / Play master); apply platform **mask** (iOS squircle) in Xcode / Play Console |
| `brand-surface-cards.svg` | 800×800 | Tile or scale; **1600×1600** for hero backgrounds |

Export steps: open SVG in design tool → set artboard to native or listed size → **Export PNG @1x / @2x** as required by each platform.

## Theming

Palette: **zinc** surfaces (`#09090b`–`#52525b`), **emerald** accents (`#10b981`, `#34d399`), **amber** highlights (`#f59e0b`, `#fbbf24`). Subtle linear gradients only; no photos or raster noise.

## YouTube safe zone

`brand-social-youtube.svg` includes a **dashed** rectangle (~**1546×424** centered) as a *guide* for title/logo placement. Devices crop channel art differently—always verify in YouTube’s uploader preview before publishing.

## Watermark

`brand-watermark.svg` uses **opacity 0.1**. On light imagery, increase opacity or use multiply/soft-light in the design tool; on dark UI, it may be nearly invisible by design.

## Usage

- **Semantic / legal**: pair lockups and banners with real product name and trademark notice in layout—not inside these SVGs.
- **Decorative**: `brand-surface-cards.svg` is suitable for subtle section backgrounds; avoid competing with body copy.
