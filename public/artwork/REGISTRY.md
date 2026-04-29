# MyCardArchive — Visual registry (Phases 21–31)

Single index for **branded visuals** shipped across Phases **21–30**, plus this consolidation (**31**). For **tokens, philosophy, and global rules**, see **`ARTWORK_STYLE_GUIDE.md`** in this folder—this file does not duplicate that document.

Sections **1–6** match the consolidation brief; **7–10** spell out **onboarding, empty states, micro, and brand** (Phases 27–30) so every artwork subtree is indexed.

**Paths** below are URL paths under the site root (`/public` → served as `/…`).

---

## 1. Overview

| Area | Root | Phase | Role |
|------|------|-------|------|
| **UI icons** | `/icons/` | 21 + 23 | Stroke icons for navigation, actions, rarity, scan, etc. |
| **Artwork illustrations** | `/artwork/` | 22+ | Marketing, OG templates, achievements, empty states, onboarding, micro, brand |
| **Dynamic OG PNGs** | Next.js routes `(og)/…` | 26 | Server-rendered share images (not static files under `/public`) |

**Vector first:** Prefer SVG in product and docs; PNG only where a platform requires raster (see per-folder README files).

**Palette & motion:** Zinc / emerald / amber per **`ARTWORK_STYLE_GUIDE.md`**. UI motion elsewhere uses `duration-200` + `ease-mca-standard` (app shell).

**Decorative vs semantic**

| Kind | Meaning | a11y hint |
|------|---------|-----------|
| **Decorative** | Mood only; never the only cue | Often `aria-hidden="true"` when paired with visible text |
| **Semantic** | Status, achievement, or empty-state story | Keep meaningful `<title>` / labels in UI alongside the asset |

---

## 2. Icon system (Phase 21 + 23)

**Root:** `/icons/`  

**Language:** Stroke **1.75**, rounded caps/joins, **`currentColor`**-friendly where possible. Organized by domain folders (not all icons were regenerated in Phase 23—legacy paths may still exist).

### Inventory by folder

| Folder | Path | Examples | Notes |
|--------|------|----------|--------|
| `ui/` | `/icons/ui/` | `home`, `menu`, `close`, `chevron-*`, `search`, `filter`, … | Controls |
| `collection/` | `/icons/collection/` | `binder`, `cards`, `deck`, `sets`, `inventory`, `analytics` | Collection IA |
| `trading/` | `/icons/trading/` | `trades`, `matching`, `offer`, `handshake` | Trading |
| `scan/` | `/icons/scan/` | `camera`, `scan-frame`, `iris` | Scan pipeline |
| `activity/` | `/icons/activity/` | `bell`, `pulse`, `timeline`, `history`, `sparkles` | Activity / alerts |
| `account/` | `/icons/account/` | `user`, `settings`, `billing`, `achievements`, `sign-out` | Account |
| App icons | `/icons/{ui,collection,trading,scan,activity,account,system}/` | See `src/lib/icons/mca-icons.ts` + `scripts/generate-mca-placeholder-icons.mjs` | Placeholder set (Phase: icon system) |
| Rarity | `/icons/collection/rarity/` | `common` … `secret`, `ultra` | Rarity pips |
| `system/` | `/icons/system/` | `help`, `alert`, `success`, `loading`, `info` | System chrome |

**Count:** 66 `.svg` files at time of registry authoring.

**PNG export:** Icons are built for inline SVG or `<img>`; export at **24×24** / **32×32** if a raster sprite is required.

---

## 3. Artwork system (Phase 22)

**Root:** `/artwork/`

Phase 22 introduced the **`/artwork/` tree** and **`ARTWORK_STYLE_GUIDE.md`**. Subfolders are listed in the sections below; each may include its own `README.md`.

**Cross-reference:** `ASSET_CATALOG.md` (Phase 22) is a historical listing—**this REGISTRY** is the consolidated index for Phases 21–30; prefer REGISTRY + folder READMEs for current scope.

---

## 4. Achievement badges (Phase 24)

**Path:** `/artwork/achievements/`  
**README:** [`achievements/README.md`](./achievements/README.md)

| File | Purpose | viewBox | Semantic |
|------|---------|---------|----------|
| `tier-bronze.svg` | Tier: bronze | 128×128 | Semantic (tier) |
| `tier-silver.svg` | Tier: silver | 128×128 | Semantic |
| `tier-gold.svg` | Tier: gold | 128×128 | Semantic |
| `tier-platinum.svg` | Tier: platinum | 128×128 | Semantic |
| `tier-diamond.svg` | Tier: diamond | 128×128 | Semantic |
| `milestone-10-cards.svg` | Milestone: 10 cards | 128×128 | Semantic |
| `milestone-100-cards.svg` | Milestone: 100 cards | 128×128 | Semantic |
| `milestone-1000-cards.svg` | Milestone: 1000 cards | 128×128 | Semantic |
| `special-first-trade.svg` | First trade | 128×128 | Semantic |
| `special-first-binder.svg` | First binder | 128×128 | Semantic |
| `special-first-deck.svg` | First deck | 128×128 | Semantic |

**Rules:** No `<text>`; numerals are shapes/patterns. Subtle metallic/prismatic gradients allowed. **`role="img"`** + default **`aria-hidden="true"`** on roots (override when the badge is the only status indicator).  
**PNG:** **32 / 64 / 128 / 256** width per README.

---

## 5. Marketing & OG (Phase 25)

### Marketing heroes & features

**Path:** `/artwork/marketing/`  
**README:** [`marketing/README.md`](./marketing/README.md)

| File | viewBox | Purpose |
|------|---------|---------|
| `marketing-home-hero.svg` | 1920×640 | Homepage / wide hero |
| `marketing-dashboard-hero.svg` | 1600×480 | In-app dashboard band |
| `marketing-collection-feature.svg` | 640×400 | Collection feature |
| `marketing-trading-feature.svg` | 640×400 | Trading feature |
| `marketing-scan-feature.svg` | 640×400 | Scan feature |

**Rules:** Soft zinc field, layered cards/binders/decks as silhouettes; optional subtle `feDropShadow` on heroes **only** (see files). No `<text>`.

**PNG exports:** Documented in `marketing/README.md` (e.g. hero **1920×640**, features @2x).

### OG static templates

**Path:** `/artwork/og/`  
**README:** [`og/README.md`](./og/README.md)

| File | viewBox | Theme |
|------|---------|--------|
| `og-template.svg` | 1200×630 | Dark (default) |
| `og-template-dark.svg` | 1200×630 | Dark (explicit) |
| `og-template-light.svg` | 1200×630 | Light |

**Rules:** Dashed **safe zone**, chrome **bars** (no baked copy), card column motif—aligned with Phase 25 layout. **`opengraph-image` routes** generate **dynamic** PNGs; these SVGs remain layout references and design exports.

---

## 6. OG automation assets (Phase 26)

Dynamic **1200×630 PNGs** are produced by **`next/og`** (`ImageResponse`), not by static files in `/public`. Code lives under `src/` (documentation scope only).

### Routes (URL paths; `(og)` is invisible in URLs)

| Pattern | Purpose |
|---------|---------|
| `/binder/[id]/opengraph-image` | Binder (generic when data is private under RLS) |
| `/deck/[id]/opengraph-image` | Public deck via `loadPublicDeck` |
| `/card/[id]/opengraph-image` | Catalog card (anon-readable catalog) |
| `/trade/[id]/opengraph-image` | Trade (generic) |
| `/user/[id]/opengraph-image` | Profile (generic) |
| `/marketing/[slug]/opengraph-image` | Static marketing slugs (`home`, `collect`, `trade`, `scan`, …) |

### Shared implementation

| Path | Role |
|------|------|
| `src/lib/og/mca-og-image.tsx` | Branded `ImageResponse` layout (chrome strip, motifs) |
| `src/lib/og/og-asset-base-url.ts` | Absolute URLs for `/public` art in OG |
| `src/lib/og/og-copy.ts` | Truncation helpers |
| `src/lib/og/marketing-og-slugs.ts` | Marketing slug → title/motif map |

**Assets used at runtime:** Motifs from `/artwork/marketing/…`, `/artwork/achievements/…` (URLs resolved with `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL`). See **`og/README.md`** (Phase 26 section).

**Also:** `src/app/d/[deckId]/opengraph-image.tsx` — alternate public-deck OG (pre-existing); not under `(og)/`.

---

## 7. Onboarding (Phase 27)

**Path:** `/artwork/onboarding/`  
**README:** [`onboarding/README.md`](./onboarding/README.md)

| File | viewBox | Purpose |
|------|---------|---------|
| `onboarding-welcome.svg` | 520×280 | Welcome step |
| `onboarding-add-binder.svg` | 520×280 | Add binder |
| `onboarding-scan-card.svg` | 520×280 | Scan card |
| `onboarding-start-trading.svg` | 520×280 | Start trading |

**Tone:** Friendly scene cards; decorative + story context (`<title>` on each file). No `<text>`.

**PNG:** **520×280** / **1040×560** @2x per README.

---

## 8. Empty-state illustrations (Phase 28)

**Path:** `/artwork/empty-states/`  
**README:** [`empty-states/README.md`](./empty-states/README.md)

| File | viewBox | Purpose |
|------|---------|---------|
| `empty-no-binders.svg` | 400×220 | No binders |
| `empty-no-decks.svg` | 400×220 | No decks |
| `empty-no-cards.svg` | 400×220 | No cards |
| `empty-no-trades.svg` | 400×220 | No trades |
| `empty-no-matches.svg` | 400×220 | No matches |
| `empty-no-activity.svg` | 400×220 | No activity |
| `empty-no-notifications.svg` | 400×220 | No notifications |
| `empty-no-scan-results.svg` | 400×220 | No scan results |

**Rules:** Root **`color="#71717a"`** + **`currentColor`** for zinc wireframes; fixed hex for accents. Stroke **~1.75**; single **`feDropShadow`** only on **`empty-no-decks.svg`**. Semantic “empty” context—pair with copy in the UI.

**PNG:** **400×220** / **800×440** @2x per README.

---

## 9. Micro-illustrations (Phase 29)

**Path:** `/artwork/micro/`  
**README:** [`micro/README.md`](./micro/README.md)

| File | viewBox | Purpose |
|------|---------|---------|
| `micro-helper-scan.svg` | 64×64 | Tooltip / helper: scan |
| `micro-helper-trade.svg` | 64×64 | Helper: trade |
| `micro-helper-collection.svg` | 64×64 | Helper: collection |
| `micro-modal-success.svg` | 64×64 | Modal spot: success |
| `micro-modal-error.svg` | 64×64 | Modal spot: error (rose accent) |
| `micro-modal-warning.svg` | 64×64 | Modal spot: warning (amber) |
| `micro-premium-tier.svg` | 64×64 | Tier / upsell |
| `micro-premium-feature.svg` | 64×64 | Premium feature |
| `micro-sparkle.svg` | 48×48 | Decorative sparkle (`color` amber) |
| `micro-card-silhouette.svg` | 48×48 | Decorative card chip |
| `micro-chevron-ambient.svg` | 72×32 | Decorative ambient chevrons |
| `micro-settings.svg` | 64×64 | Settings / account |
| `micro-billing.svg` | 64×64 | Billing |
| `micro-security.svg` | 64×64 | Security |

**Rules:** Stroke **1.75** on outlines; modal status uses fixed semantic colors. Sparkle / chevron / card silhouette: **decorative**; modal + helpers: **semantic** when used alone (see `micro/README.md`).

**PNG:** **48×48**, **96×96** per README.

---

## 10. Brand export pack (Phase 30)

**Path:** `/artwork/brand/`  
**README:** [`brand/README.md`](./brand/README.md)

| File | viewBox | Purpose |
|------|---------|---------|
| `brand-social-twitter.svg` | 1500×500 | X/Twitter header |
| `brand-social-facebook.svg` | 1200×630 | Facebook / link preview parity |
| `brand-social-linkedin.svg` | 1128×191 | LinkedIn cover |
| `brand-social-youtube.svg` | 2560×1440 | YouTube channel art (+ safe-zone guide) |
| `brand-logo-lockup.svg` | 960×240 | Horizontal geometric lockup |
| `brand-logo-lockup-vertical.svg` | 420×560 | Vertical lockup |
| `brand-badge.svg` | 512×512 | Square emblem |
| `brand-watermark.svg` | 800×800 | Low-opacity watermark |
| `brand-appstore-hero.svg` | 4320×1080 | Storefront hero |
| `brand-appstore-feature.svg` | 1024×500 | Feature slide |
| `brand-appstore-icon.svg` | 1024×1024 | App icon master (mask in store tools) |
| `brand-surface-cards.svg` | 800×800 | Tiling card surface |

**Rules:** Geometric “card + emerald + amber” language; **no embedded wordmark**—add typography in design tools. Subtle gradients only.

---

## Quick reference: strokes & gradients

| Layer | Typical stroke | Gradients |
|--------|----------------|-----------|
| Icons (`/icons/`) | **1.75** | None (stroke-only) |
| Achievement badges | **1.5–2.75** (varies) | Subtle linear (metallic/prismatic) |
| Empty states | **1.75** + `currentColor` | Background only, subtle |
| Marketing / OG templates | **1.5–2.5** | Background soft blends |
| Micro | **1.75** | Minimal |
| Brand | Varies by scale | Subtle; no noise |

---

## Contributing

1. Add or replace assets **without renaming** files when the app already references paths.  
2. Update **this REGISTRY** and the relevant folder **`README.md`**.  
3. Follow **`ARTWORK_STYLE_GUIDE.md`**.  
4. Prefer **`currentColor`** on wireframes where parents can set `color`; keep fixed accents legible on zinc backgrounds.

---

*Phase 31 — Design system consolidation. Registry format version 1.*
