# Card

`Card` — Rounded bordered surface for stats tiles, compact summaries, and analytics-style blocks. Optional `elevated` adds hover shadow lift.

**Source:** [`src/mca-ui/card.tsx`](../../src/mca-ui/card.tsx)

---

## Overview

- Renders `<div>` with `rounded-mca-block`, border, `bg-mca-surface-elevated/80`, `shadow-mca-panel`, `duration-200`, `ease-mca-standard`.
- `elevated` adds `hover:shadow-mca-card` for interactive-feeling metric cards.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevated` | `boolean` | — | Stronger hover shadow (analytics-style tiles). |
| `className` | `string` | — | Additional classes. |
| *(rest)* | `HTMLAttributes<HTMLDivElement>` | — | Standard div props. |

---

## Variants

**Surface:** default vs `elevated` (hover emphasis).

---

## Usage examples

```tsx
import { Card } from "@/mca-ui";

<Card className="p-mca-md">
  <p className="text-mca-caption text-mca-hint">Total</p>
  <p className="text-2xl font-semibold text-mca-ink-strong">1,240</p>
</Card>

<Card elevated className="p-mca-md cursor-default">
  Hover lifts shadow slightly.
</Card>
```

---

## Accessibility

- If the whole card is clickable, wrap with `<a>` / `<button>` or ensure a clear focus target and name.
- Prefer semantic headings inside for structure when the card is a self-contained summary.

---

## Token usage

- **Radius:** `rounded-mca-block`.
- **Border:** `border-mca-border` / `dark:border-mca-border-subtle`.
- **Shadow:** `shadow-mca-panel`; `elevated` → `hover:shadow-mca-card`.

---

## Composition

- Works with [`MetricBlock`](./metric-block.md) / dashboard grids.
- [`RemoteCardThumb`](./remote-card-thumb.md) may live inside a relatively positioned wrapper; `Card` is not specialized for TCG images — use any container that provides aspect/size.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use in grids with consistent `gap-mca-*`. | Use as a full-page shell — use layout templates / [`Panel`](./panel.md). |

---

## Related

- [Panel](./panel.md)
- [MetricBlock](./metric-block.md)
- [ChartContainer](./chart-container.md)
