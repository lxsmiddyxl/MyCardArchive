# Micro-illustrations (Phase 29)

Small vector assets for tooltips, modals, upsell moments, and inline decoration. Aligned with `ARTWORK_STYLE_GUIDE.md` and Phases 23–28 geometry (soft radii, zinc/emerald/amber).

## PNG export

| Use | Size |
|-----|------|
| Dense UI / list rows | **24×24** or **32×32** |
| Tooltips, helper rows | **48×48** |
| Modal headers, feature cards | **64×64** or **96×96** |

Raster exports are optional; **SVG is preferred** in Next/React for crisp scaling.

## Theming

- Default wireframes use **`color="#71717a"`** on the root `<svg>` with **`stroke="currentColor"`** / **`fill="currentColor"`** where sensible.
- For **sparkle** (`micro-sparkle.svg`), the root **`color="#fbbf24"`** sets the accent; override with `className="text-amber-400"` (or similar) when inlining.
- **Semantic accents** (success emerald, error rose `fb7185`, warning amber, premium gold gradient) use **fixed hex** so status stays legible on dark surfaces.

## Usage guidelines

| Kind | Role |
|------|------|
| **Decorative** (`micro-sparkle`, `micro-chevron-ambient`, `micro-card-silhouette`) | Purely ornamental. Pair with visible text; set `aria-hidden="true"` when redundant with labels. |
| **Semantic** (`micro-modal-*`, helpers, premium, account icons) | Reinforces meaning; keep **`<title>`** for accessible name when the image is the only cue, and supply redundant copy in the UI where possible. |

Do not rely on micro-art alone to convey errors or billing state — always include a textual message.

## Files

| File | Role |
|------|------|
| `micro-helper-scan.svg` | Scan hint |
| `micro-helper-trade.svg` | Trade hint |
| `micro-helper-collection.svg` | Binder / collection hint |
| `micro-modal-success.svg` | Positive confirmation |
| `micro-modal-error.svg` | Failure (rose accent) |
| `micro-modal-warning.svg` | Caution (amber) |
| `micro-premium-tier.svg` | Tier / upgrade |
| `micro-premium-feature.svg` | Feature highlight |
| `micro-sparkle.svg` | Inline sparkle |
| `micro-card-silhouette.svg` | Card chip |
| `micro-chevron-ambient.svg` | Wide ambient motion |
| `micro-settings.svg` | Settings |
| `micro-billing.svg` | Billing |
| `micro-security.svg` | Security / account safety |
