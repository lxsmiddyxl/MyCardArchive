# ChartContainer

`ChartContainer` — Framed region for charts: border, padding, subtle elevated background, panel shadow.

**Source:** [`src/mca-ui/chart-container.tsx`](../../src/mca-ui/chart-container.tsx)

---

## Overview

- Renders `<div>` with token classes: `rounded-mca-block`, `border-mca-border-subtle`, `bg-mca-surface-elevated/60`, `p-mca-md`, `shadow-mca-panel`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | Merged with container styles. |
| *(rest)* | `HTMLAttributes<HTMLDivElement>` | — | `id`, `role`, `aria-*`, etc. |

---

## Variants

None — adjust framing via `className` only if needed.

---

## Usage examples

```tsx
import { ChartContainer } from "@/mca-ui";

<ChartContainer className="min-h-[240px]">
  {/* chart library output */}
</ChartContainer>
```

---

## Accessibility

- The container is decorative framing; put an accessible title on the chart (e.g. `aria-label` on SVG, `figure` + `figcaption`, or a visible heading above).
- Ensure color-only data is not the only cue — legends and labels belong in the chart layer.

---

## Token usage

- **Radius:** `rounded-mca-block`
- **Border:** `border-mca-border-subtle` (dark variant in class string)
- **Background:** `bg-mca-surface-elevated/60`
- **Padding:** `p-mca-md`
- **Shadow:** `shadow-mca-panel`

---

## Composition

- Place Recharts / other chart roots inside; pair with [`SectionShell`](./section.md) for page structure.
- For KPI numbers without a chart, see [`MetricBlock`](./metric-block.md).

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Keep min-height predictable to avoid layout shift. | Use as a modal — use [`ModalBase`](./modal-base.md). |

---

## Related

- [Card](./card.md)
- [MetricBlock](./metric-block.md)
- [Panel](./panel.md)
