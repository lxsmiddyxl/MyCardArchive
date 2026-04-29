# MyCardArchive — Artwork System (Phase 22)

Foundation for **empty states**, **achievement badges**, **onboarding**, **marketing heroes**, and **OG** artwork. All visuals align with the app shell: **dark zinc** surfaces, **emerald** focus/success accents, **amber** highlights, soft **Apple-like** geometry, **vector-first**, **no photography**.

---

## 1. Principles

| Principle | Application |
|-----------|-------------|
| **Premium minimal** | Few shapes, generous whitespace, no clutter |
| **Soft geometry** | Large corner radii (`14–24` relative units in SVG), pill shapes, superellipse feel |
| **Readable at small size** | Badges work at ~32–64px; empty states scale in UI with `max-w-*` |
| **currentColor-friendly** | Where possible, strokes use `currentColor` so parents can theme |
| **No noise** | No textures, no heavy gradients; optional **subtle** linear gradients (5–15% opacity steps) |

---

## 2. Color tokens (Tailwind-aligned)

| Role | Typical use | SVG notes |
|------|-------------|-----------|
| **Zinc 950 / 900** | Deep fills, panels | `#09090b`, `#18181b` |
| **Zinc 700 / 600** | Strokes, dividers | `#3f3f46`, `#52525b` |
| **Zinc 400** | Secondary strokes | `#a1a1aa` |
| **Emerald 500 / 400** | Positive, tier progression | `#10b981`, `#34d399` |
| **Amber 500 / 400** | Highlights, alerts, “special” | `#f59e0b`, `#fbbf24` |

Use **hex** in standalone SVGs under `public/` for consistency without CSS.

---

## 3. Geometry & stroke

- **Grid**: Icon-sized badges **24×24** to **120×120**; illustrations **320×200** to **960×400** (flexible `viewBox`).
- **Stroke**: **1.75px** where stroke-only (matches Phase 21 icon pack); filled badges may use **no stroke** or **1.5–2** hairline.
- **Corners**: `rx` / `ry` **12–32** on rectangles; circles for dots and medal cuts.
- **Shadows**: Prefer **flat**; optional **single** drop shadow (`feDropShadow` very subtle) on hero art only.

---

## 4. Category guidelines

### A. Empty states

- **Tone**: Calm, encouraging; **no** alarming reds (except product error patterns elsewhere).
- **Layout**: Centered motif + optional ground line + **1** accent (emerald or amber).
- **Naming**: `empty-<context>.svg` in `empty-states/`.

### B. Achievements

- **Tier badges**: Distinct **silhouette** + color (bronze/copper, silver, gold, platinum cool, diamond prismatic subtle **or** monochrome + label).
- **Milestone**: Number-led (10 / 100 / 1000) inside rounded plate.
- **Special**: Story beat (first trade, first binder, first deck) — simple symbolic illustration.
- **Naming**: `tier-<name>.svg`, `milestone-<n>-cards.svg`, `special-<slug>.svg`.

### C. Onboarding

- **Scene cards**: welcoming, not busy; **one focal object** per illustration.
- **Naming**: `onboarding-<slug>.svg`.

### D. Marketing / hero

- **Wide viewBox** (e.g. **960×360**); safe padding **48** units from edges for text overlays added in code or design tool.
- **Recommendation**: Ship **SVG** for scalability; export **PNG @2x** (`1920×720`) for CMS/email if needed.

### E. OG (Open Graph)

- **Template**: Fixed aspect **1200×630** (1.91:1). Safe text zone **top-left** or **bottom band** (see `og/README.md`).
- Use **card silhouette** + brand bar; **dynamic headline** applied in `opengraph-image` route later — assets here are **static templates**.

---

## 5. File formats

| Format | When |
|--------|------|
| **SVG** | Default for web; all Phase 22 placeholders are SVG |
| **PNG** | Optional export for heroes/OG when raster needed (marketing, social) |

---

## 6. Versioning & replacement

Placeholders are **explicitly replaceable**: swap files **without renaming** to preserve imports once wired from UI (future phase).

---

## 7. Related systems

- **Icons**: `/public/icons/` (Phase 21 stroke language).
- **Tailwind tokens**: `globals.css` (`zinc`, `emerald`, `amber`, motion).
