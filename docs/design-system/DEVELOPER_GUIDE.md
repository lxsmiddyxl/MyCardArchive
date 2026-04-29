# MyCardArchive — Developer Design System Handbook

Internal guide for **building UI in code** with MyCardArchive (MCA) tokens, primitives, and lint guardrails. For **artwork, marketing SVGs, and illustration geometry**, see [`public/artwork/ARTWORK_STYLE_GUIDE.md`](../../public/artwork/ARTWORK_STYLE_GUIDE.md) — this document does not repeat those guidelines.

**Source of truth for tokens:** [`src/styles/tokens`](../../src/styles/tokens) (barrel export [`@/styles/tokens`](../../src/styles/tokens/index.ts)). Tailwind receives semantic values via `mcaTailwindExtend` in [`tailwind.config.ts`](../../tailwind.config.ts).

---

## 1. Overview

The MCA design system layers **semantic tokens** on top of Tailwind:

| Layer | Role |
|--------|------|
| **TypeScript tokens** | Single source of truth: `mcaSemantic`, `spacing`, `radius`, `shadows`, `strokeWidth`, optional raw `mcaPalette` for charts/canvas |
| **Tailwind `mca-*` utilities** | `text-mca-ink-body`, `gap-mca-sm`, `rounded-mca-card`, `shadow-mca-panel`, … |
| **CSS** | [`src/app/globals.css`](../../src/app/globals.css) defines `--mca-space-*` and component shells (e.g. `.mca-panel`, `.mca-input`) |
| **Primitives** | [`@/mca-ui`](../../src/mca-ui/) — [`Button`](../../src/mca-ui/button.tsx), [`Field`](../../src/mca-ui/field.tsx), [`Panel`](../../src/mca-ui/panel.tsx), modals, etc. See [`IMPORTS.md`](./IMPORTS.md). **Interaction patterns:** [`INTERACTION_MODEL.md`](./INTERACTION_MODEL.md). |

**Rule of thumb:** Prefer **semantic `mca-*` classes** for color, spacing, radius, and elevation. Use plain Tailwind for layout (`flex`, `grid`, `min-h-screen`), breakpoints (`md:`, `lg:`), and one-off values only when no token exists (see [§11](#11-migration-notes)).

---

## 2. Token Philosophy

1. **Import from the barrel** — Use `import { mcaSemantic, spacing } from "@/styles/tokens"`. Do **not** deep-import `@/styles/tokens/colors` (ESLint blocks it outside `src/styles/tokens/`).
2. **Semantic over raw palette** — UI uses **`mcaSemantic`** keys (e.g. `inkStrong`, `border`) exposed as Tailwind `text-mca-ink-strong`, `border-mca-border`. Raw zinc/emerald/amber scales live in token files for charts and documentation parity, not for ad-hoc `text-zinc-400` in JSX.
3. **Charts & non-Tailwind color** — Use `mcaPalette` / `mcaSemantic` in TS when passing hex into canvas, SVG props, or OG-related code.
4. **Kebab-case in Tailwind** — CamelCase keys in `mcaSemantic` become utilities with hyphens: `inkStrong` → `text-mca-ink-strong`.

```tsx
import { mcaSemantic } from "@/styles/tokens";

// Non-Tailwind context (e.g. chart stroke)
const axisColor = mcaSemantic.chartAxis;
```

```tsx
// Preferred in JSX
<p className="text-mca-ink-body">Body copy</p>
```

---

## 3. Color System

Semantic colors are defined in [`src/styles/tokens/colors.ts`](../../src/styles/tokens/colors.ts) as **`mcaSemantic`**. Tailwind maps them under `theme.extend.colors.mca`.

### 3.1 Ink & chrome (text / surfaces)

| Concept | Typical utilities |
|---------|-------------------|
| Primary text | `text-mca-ink-strong`, `text-mca-ink-body` |
| Secondary | `text-mca-ink-muted`, `text-mca-ink-subtle`, `text-mca-hint` |
| App background | `bg-mca-surface`, `bg-mca-surface-elevated` |
| Chrome / inputs | `bg-mca-chrome`, `border-mca-field-border`, `border-mca-border` |

### 3.2 Accent & focus

| Concept | Typical utilities |
|---------|-------------------|
| CTAs, highlights | `bg-mca-accent-strong`, `text-mca-nav-accent`, `border-mca-accent-border` |
| Focus rings | `focus-visible:ring-mca-focus/60`, `ring-mca-focus` |

### 3.3 Status (success, warning, error, info)

Use **semantic status tokens**, not raw `emerald-*` / `amber-*` / `rose-*` / `sky-*`:

| Status | Examples |
|--------|----------|
| Success | `text-mca-success`, `bg-mca-success-surface`, `border-mca-success-border` |
| Warning | `text-mca-warning-text`, `bg-mca-warning-surface` |
| Error / destructive | `text-mca-error-text`, `bg-mca-error-surface`, `border-mca-error-border`, `text-mca-error-accent` |
| Info | `text-mca-info-text`, `bg-mca-info-surface`, `border-mca-info-border`, `bg-mca-info-bar` |

Pokémon-related **type accents** (e.g. water/psychic dots): `bg-mca-type-water`, `text-mca-type-psychic-ink`, `bg-mca-type-psychic-tint`, etc.

### 3.4 Light-mode shells

For public/marketing-style surfaces: `bg-mca-surface-light`, `border-mca-border-light`, `text-mca-chrome` on light buttons — see token names in `mcaSemantic` for full list.

```tsx
<div className="rounded-mca-card border border-mca-border-subtle bg-mca-surface-elevated p-mca-md text-mca-ink-strong">
  <p className="text-mca-ink-muted">Secondary line</p>
</div>
```

---

## 4. Spacing System

Defined in [`src/styles/tokens/spacing.ts`](../../src/styles/tokens/spacing.ts): **`spacing`** (raw rem) and **`spacingTw`** (CSS `var(--mca-space-*, …)` for Tailwind).

### 4.1 Using `mca-*` spacing utilities

Use **`p-mca-*`**, **`gap-mca-*`**, **`space-x-mca-*`**, **`space-y-mca-*`**, **`m*-mca-*`**, etc. — **not** Tailwind’s default `p-4`, `gap-6`, `space-y-4`.

| Token | Role (approx. legacy step) |
|-------|----------------------------|
| `mca-trace` | Tight chips, `0.5` step |
| `mca-xs` | Minimal gaps |
| `mca-sm` … `mca-compact` | Dense UI, form rows |
| `mca-base` / `mca-md` | 1rem default block |
| `mca-lg` … `mca-xl` | Section spacing |
| `mca-loft` | ~1.75rem |
| `mca-section` | ~2.5rem (large stacks, empty states) |
| `mca-2xl` | 3rem |
| `mca-jumbo` | ~3.5rem |
| `mca-stage` | ~4rem vertical rhythm |

CSS variables are set under `html.dark` in [`globals.css`](../../src/app/globals.css); utilities resolve through `var(--mca-space-*, …)`.

```tsx
<section className="space-y-mca-base px-mca-lg py-mca-xl">
  <div className="flex flex-col gap-mca-sm md:flex-row md:gap-mca-md">…</div>
</section>
```

### 4.2 Zeros & arbitrary values

- **`p-0`**, **`gap-0`**, **`mt-0`** remain valid where you need literal zero.
- **Arbitrary values** like `min-h-[220px]` or `p-[13px]` are allowed when no token fits; use sparingly.

---

## 5. Radii & Geometry

[`src/styles/tokens/radii.ts`](../../src/styles/tokens/radii.ts) exports **`radius`**, wired in Tailwind as **`rounded-mca-*`**:

| Token | Typical use |
|-------|-------------|
| `rounded-mca-card` | Cards, compact panels |
| `rounded-mca-panel` | Panels (see `.mca-panel`) |
| `rounded-mca-block` | Rows, list tiles |
| `rounded-mca-sheet` | Large sheets |
| `rounded-mca-control` | Buttons, inputs |
| `rounded-mca-pill` | Pills, small badges |

**Do not** use `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` for product UI — ESLint enforces MCA radii.

```tsx
<button type="button" className="rounded-mca-control px-mca-compact py-mca-sm">…</button>
```

---

## 6. Shadows & Depth

[`src/styles/tokens/shadows.ts`](../../src/styles/tokens/shadows.ts):

| Token | Use |
|-------|-----|
| `shadow-mca-card` | Elevated cards, modals, heavy elevation |
| `shadow-mca-panel` | Light chrome, inputs, subtle lift |

**Do not** use `shadow-sm` / `shadow-md` / `shadow-lg` in app UI.

Strokes for icons are documented in [`strokes.ts`](../../src/styles/tokens/strokes.ts) (`strokeWidth.icon` = **1.75** aligned with the icon pack); in Tailwind you may use `stroke-[1.75]` where needed.

```tsx
<div className="rounded-mca-card border border-mca-border-subtle bg-mca-surface-elevated shadow-mca-card">
  …
</div>
```

---

## 7. Component Primitives

Prefer shared components over one-off class strings.

### 7.1 Button

[`Button`](../../src/components/ui/button.tsx) — variants: `primary`, `secondary`, `tertiary`, `destructive`. Uses MCA tokens for borders, surfaces, focus, and motion (`duration-200`, `ease-mca-standard`).

```tsx
import { Button } from "@/components/ui/button";

<Button variant="primary" type="submit">Save</Button>
<Button variant="destructive">Remove</Button>
```

### 7.2 Field

[`Field`](../../src/components/ui/field.tsx) — label, optional hint, error line with `text-mca-error-accent`, wires `htmlFor` / `id` for accessibility.

```tsx
import { Field } from "@/components/ui/field";

<Field id="email" label="Email" error={errors.email}>
  <input id="email" className="mca-input border-mca-border-subtle bg-mca-surface-elevated …" />
</Field>
```

### 7.3 Panel

[`Panel`](../../src/components/ui/panel.tsx) — applies `mca-panel` + padding; optional `elevated` for `shadow-mca-card`.

```tsx
import { Panel } from "@/components/ui/panel";

<Panel elevated>
  …
</Panel>
```

### 7.4 Globals: `.mca-panel` and `.mca-input`

[`globals.css`](../../src/app/globals.css) defines **`.mca-panel`** (rounded panel + border + shadow) and **`.mca-input`** (control radius, padding, focus ring). Compose with MCA utility classes for borders/colors in dark theme.

---

## 8. Accessibility Rules (Phase 32)

- **Decorative inline SVGs** — `aria-hidden="true"` and typically `focusable="false"` when used beside visible text.
- **Meaningful inline SVGs** — `role="img"` with **`aria-label`** or **`aria-labelledby`** (e.g. charts).
- **Forms** — Use `Field` / labels / `role="alert"` for errors (`Field` and `InlineError` follow this).
- **ESLint** — `mca-design-system/jsx-svg-accessibility` warns on `<svg>` without an allowed pattern (spread props skip static analysis).

```tsx
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-4 w-4">
  …
</svg>
```

---

## 9. Guardrails & Lint Rules (Phase 37)

Plugin: [`eslint-plugins/mca-design-system`](../../eslint-plugins/mca-design-system). Config: [`.eslintrc.json`](../../.eslintrc.json).

| Rule | Severity | What it enforces |
|------|----------|------------------|
| `no-palette-primitives` | error | No `text-zinc-*`, `bg-emerald-*`, `rose-*`, `sky-*`, `violet-*`, etc. — use `mca-*` semantics |
| `no-legacy-border-radius` | error | No `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` |
| `no-legacy-shadow` | error | No `shadow-sm` / `shadow-md` / `shadow-lg` |
| `no-default-scale-spacing` | error | No default `p-4`, `gap-6`, `space-y-4`, … — use `*-mca-*` spacing |
| `jsx-svg-accessibility` | warn | Inline `<svg>` needs decorative or labeled pattern |
| `no-restricted-imports` | error | Token imports must be `@/styles/tokens`, not `@/styles/tokens/colors` |

Pre-commit: **`lint-staged`** runs `eslint --fix` on staged `src/**/*.{ts,tsx}` (see [`package.json`](../../package.json)).

VS Code snippets: [`.vscode/mca-tailwind.code-snippets`](../../.vscode/mca-tailwind.code-snippets).

---

## 10. Do / Don’t Examples

| Do | Don’t |
|----|--------|
| `text-mca-ink-body`, `border-mca-border` | `text-zinc-300`, `border-zinc-800` |
| `gap-mca-md`, `py-mca-section` | `gap-4`, `py-16` (numeric Tailwind scale) |
| `rounded-mca-card`, `shadow-mca-panel` | `rounded-xl`, `shadow-md` |
| `import { mcaSemantic } from "@/styles/tokens"` | `import … from "@/styles/tokens/colors"` |
| `Button`, `Field`, `Panel` for consistent chrome | Copy-pasting long raw class strings for every screen |

**Legitimate Tailwind (non-token):**

```tsx
<div className="flex min-h-0 flex-1 flex-col gap-mca-md lg:flex-row">
  …
</div>
```

Here `flex`, `min-h-0`, `lg:flex-row` are layout; spacing uses `gap-mca-md`.

---

## 11. Migration Notes

Older codebases may still mention:

- **Phase 36** — Raw rose/sky/violet utilities replaced with **`mcaSemantic`** error/info/violet keys (`text-mca-error-accent`, `bg-mca-info-surface`, …).
- **Phase 37** — ESLint plugin added; fix violations rather than disabling rules without review.
- **Phase 38** — Numeric spacing (`space-y-4`, `py-12`, …) migrated to **`mca-*`** spacing tokens (`space-y-mca-base`, `py-mca-2xl`, `mca-section`, `mca-stage`, …). See [`spacing.ts`](../../src/styles/tokens/spacing.ts) for the full map.

When touching a file, prefer aligning it with this handbook so future diffs stay clean.

---

## 12. Future-Proofing

1. **New semantic colors** — Add to `mcaSemantic` in [`colors.ts`](../../src/styles/tokens/colors.ts); Tailwind picks them up as `mca-*` automatically. Keep names descriptive (`errorText`, `infoBar`).
2. **New spacing steps** — Add to `spacing` + `spacingTw`, then add matching **`--mca-space-*`** in [`globals.css`](../../src/app/globals.css) if you rely on CSS variables for theming.
3. **New radii / shadows** — Extend `radius` / `shadows` and `mcaTailwindExtend` in [`src/styles/tokens/index.ts`](../../src/styles/tokens/index.ts).
4. **Primitives** — New buttons/inputs should use the same token vocabulary as `Button` / `.mca-input` for focus and motion (`duration-200`, `ease-mca-standard`).
5. **Artwork** — New illustrations and OG assets stay aligned with [`ARTWORK_STYLE_GUIDE.md`](../../public/artwork/ARTWORK_STYLE_GUIDE.md), not duplicated here.

---

## Quick reference

| Need | Where |
|------|--------|
| All semantic color keys | `mcaSemantic` in [`colors.ts`](../../src/styles/tokens/colors.ts) |
| Spacing scale | [`spacing.ts`](../../src/styles/tokens/spacing.ts) |
| Radius / shadow / stroke | [`radii.ts`](../../src/styles/tokens/radii.ts), [`shadows.ts`](../../src/styles/tokens/shadows.ts), [`strokes.ts`](../../src/styles/tokens/strokes.ts) |
| Tailwind wiring | [`src/styles/tokens/index.ts`](../../src/styles/tokens/index.ts) → `mcaTailwindExtend` |
| Global component classes | [`globals.css`](../../src/app/globals.css) `@layer components` |

*Last aligned with Phases 32, 36, 37, 38 — update this doc when token or lint contracts change.*
