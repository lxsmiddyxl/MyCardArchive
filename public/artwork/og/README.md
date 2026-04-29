# OG (Open Graph) artwork

## Templates (Phase 25)

- **`og-template.svg`** — **1200×630** (1.91:1), **dark** (default). Matches common social previews.
- **`og-template-dark.svg`** — Same composition as the default file (explicit dark export name).
- **`og-template-light.svg`** — **Light** background and contrast-tuned strokes for theme-aware shares.

All variants include:

- **Dashed rectangle**: safe zone for **title + subtitle** when text is composed in `opengraph-image` / Vercel OG / Canvas.
- **Right column**: abstract **card silhouette** and emerald accent (no third-party IP).
- **Bottom brand bar**: geometric placeholder (no baked-in typography in the SVG).

## Raster export

1. Open the chosen template in Figma, Sketch, Inkscape, or a headless renderer.
2. Export **PNG** at **1200×630** minimum; **2400×1260** for retina where platforms accept larger assets.
3. Prefer **dynamic** generation in-app for unique titles; keep these files as **layout reference**.

## Dynamic text

Position headlines in the dashed safe zone using the same margins (**~80px** from canvas edges on the 1200-wide layout). Avoid long strings (≈ **40–60** characters for primary title on mobile crop tests).

Placeholder **bars** in the SVG represent line lengths only; replace with real text in the OG pipeline.

---

## Dynamic PNG routes (Phase 26)

Server routes under `src/app/(og)/…` render **1200×630 PNGs** with `next/og` (`ImageResponse`). The layout mirrors the Phase 25 templates: left headline block, optional hero image or right motif, bottom chrome strip.

Set **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://your-domain.com`) so OG rendering can embed absolute URLs to `/artwork/marketing/*.svg`, `/artwork/achievements/*.svg`, and remote catalog card art.

| Path pattern | Purpose |
|----------------|----------|
| `/binder/[id]/opengraph-image` | Branded binder (private RLS: generic copy + ref id) |
| `/deck/[id]/opengraph-image` | Public deck via `loadPublicDeck` — name, format, owner, card count, hero art |
| `/card/[id]/opengraph-image` | Catalog card — name, set, number, rarity, catalog image when available |
| `/trade/[id]/opengraph-image` | Trade — generic copy (participants-only RLS) |
| `/user/[id]/opengraph-image` | Collector — generic copy + tier emblem (profiles are private to anon) |
| `/marketing/[slug]/opengraph-image` | Static marketing titles — slugs: `home`, `collect`, `trade`, `scan` |

Reference the matching URL from page **`metadata.openGraph.images`** when wiring previews to canonical pages.

