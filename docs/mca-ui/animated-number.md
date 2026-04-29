# AnimatedNumber

`AnimatedNumber` — Client-only span that eases from the **previously displayed** value to `value` (cubic ease-out). Presentation-only; not a form control.

**Source:** [`src/mca-ui/animated-number.tsx`](../../src/mca-ui/animated-number.tsx)

---

## Overview

- Uses `requestAnimationFrame` to interpolate over `durationMs` (default `550`).
- Renders `Math.round`ed integers in a `<span>`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | **required** | Target number. |
| `className` | `string` | `''` | Classes on the `<span>`. |
| `durationMs` | `number` | `550` | Animation length. |

---

## Variants

None — behavior tuned via `durationMs` and `className`.

---

## Usage examples

```tsx
import { AnimatedNumber } from "@/mca-ui";

<p className="text-2xl font-semibold tabular-nums">
  <AnimatedNumber value={totalCards} />
</p>
```

Prefer **`tabular-nums`** (via `className` on parent or `AnimatedNumber`) for stable digit width in dashboards.

---

## Accessibility

- Changing numbers may be announced by SR depending on context; for live regions, wrap in a polite live region in the feature layer if you need explicit announcements.
- This component does not set `aria-live` — it is a visual polish helper.

---

## Token usage

- No built-in typography — pass `className` for `text-mca-*` and `tabular-nums`.

---

## Composition

- Natural fit inside [`MetricBlock`](./metric-block.md) value rows.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use for dashboard counters and hero stats. | Use for inputs or currency fields that must stay editable — use controlled inputs. |

---

## Related

- [MetricBlock](./metric-block.md)
- [Card](./card.md)
