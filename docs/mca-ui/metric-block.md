# MetricGrid & MetricBlock

`MetricGrid` — responsive `<ul>` grid for dashboard metrics (1 column mobile, 3 columns from `sm`).  
`MetricBlock` — single `<li>` tile: uppercase label + custom value row as `children`.

**Source:** [`src/mca-ui/metric-block.tsx`](../../src/mca-ui/metric-block.tsx)

---

## Overview

- **MetricGrid:** `grid grid-cols-1 gap-mca-md sm:grid-cols-3`.
- **MetricBlock:** `label` prop + `children` for the value row; supports `revealClassName` for stagger helpers like `mca-section-reveal-delay-*`.

---

## Props

### MetricGrid

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | Extra grid classes. |
| *(rest)* | `HTMLAttributes<HTMLUListElement>` | — | List semantics. |

### MetricBlock

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `ReactNode` | **required** | Shown in small caps row above values. |
| `revealClassName` | `string` | — | Extra classes (e.g. reveal delay). |
| `className` | `string` | — | Tile classes. |
| `children` | `ReactNode` | — | Value row (numbers, [`AnimatedNumber`](./animated-number.md), etc.). |
| *(rest)* | `HTMLAttributes<HTMLLIElement>` (minus `title`) | — | Standard `li` props. |

---

## Variants

None — visual rhythm is fixed; use [`Card`](./card.md) or wrappers for alternate shells.

---

## Usage examples

```tsx
import { MetricGrid, MetricBlock, AnimatedNumber } from "@/mca-ui";

<MetricGrid>
  <MetricBlock label="Cards" revealClassName="mca-section-reveal-delay-1">
    <p className="text-2xl font-semibold text-mca-ink-strong">
      <AnimatedNumber value={count} />
    </p>
  </MetricBlock>
  <MetricBlock label="Sets">
    <p className="text-2xl font-semibold">42</p>
  </MetricBlock>
</MetricGrid>
```

---

## Accessibility

- **List semantics:** metrics are a list of related items — good for screen reader structure.
- Ensure `children` includes readable text for the value (not color-only).
- If values update live, consider `aria-live="polite"` on a wrapper in the feature layer (not built into `MetricBlock`).

---

## Token usage

- **MetricBlock:** `rounded-mca-block`, `border-mca-border`, `bg-mca-surface-elevated/80`, `px-mca-comfortable`, `py-mca-md`, `shadow-mca-panel`, `hover:shadow-mca-card`, `duration-200`, `ease-mca-standard`.
- **Label:** `text-[10px] uppercase tracking-[0.18em] text-mca-ink-subtle`.

---

## Composition

- Use [`AnimatedNumber`](./animated-number.md) for animated counts.
- Wrap sections with [`SectionShell`](./section.md); place grids inside [`Panel`](./panel.md) or page layout as needed.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `MetricGrid` as the parent of `MetricBlock` items. | Put non-metric content in `MetricBlock` without a clear label. |

---

## Related

- [AnimatedNumber](./animated-number.md)
- [Card](./card.md)
- [ChartContainer](./chart-container.md)
