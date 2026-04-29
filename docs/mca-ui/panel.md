# Panel

`Panel` — Applies `.mca-panel` with default padding (`p-mca-md`). Optional `elevated` adds a stronger card shadow.

**Source:** [`src/mca-ui/panel.tsx`](../../src/mca-ui/panel.tsx)

---

## Overview

- Renders `<div>` with `mca-panel p-mca-md` merged with optional `className`.
- `elevated` applies `shadow-mca-card` for emphasis.
- For overlays, use [`ModalBase`](./modal-base.md), not `Panel`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevated` | `boolean` | — | Stronger shadow for elevated surfaces. |
| `className` | `string` | — | Extra classes on the root. |
| `children` | `ReactNode` | — | Content. |
| *(rest)* | `HTMLAttributes<HTMLDivElement>` | — | `role`, `aria-*`, etc. |

---

## Variants

Optional **elevation**: default panel vs `elevated={true}`.

---

## Usage examples

```tsx
import { Panel } from "@/mca-ui";

<Panel>
  <p className="text-mca-muted">Default padded panel.</p>
</Panel>

<Panel elevated className="space-y-4">
  <h2 className="text-lg font-semibold text-mca-ink-strong">Highlights</h2>
</Panel>
```

---

## Accessibility

- Use headings inside when the panel is a major content block.
- If the panel is a named region, consider `aria-labelledby` pointing at a heading id.

---

## Token usage

- **Surface:** `.mca-panel` (border, radius, background — see globals).
- **Padding:** default `p-mca-md`; override with `className` if needed.
- **Shadow:** `elevated` → `shadow-mca-card`.

---

## Composition

- Nest [`Field`](./field.md) / [`Input`](./input.md) for forms.
- [`Card`](./card.md) is a different surface (metric tiles, bordered blocks); pick one pattern per screen for consistency.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `elevated` sparingly for hierarchy. | Use `Panel` as a modal container. |

---

## Related

- [Card](./card.md)
- [SectionShell](./section.md)
- [ModalBase](./modal-base.md)
