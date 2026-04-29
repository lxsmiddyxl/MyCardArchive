# TradeStatusBadge

`TradeStatusBadge` — Small uppercase chip showing a trade’s `TradeStatus` with token-mapped border/background/text. Wrapped in `memo`.

**Source:** [`src/mca-ui/trade-status-badge.tsx`](../../src/mca-ui/trade-status-badge.tsx)

---

## Overview

- **`status`** comes from `@/lib/trading/types`: `"draft" | "sent" | "accepted" | "declined" | "countered" | "completed"`.
- Renders the raw status string as visible text (English enum value).
- Unknown status falls back to `draft` styling (`?? STATUS_STYLES.draft`).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `TradeStatus` | **required** | Trade state. |
| `className` | `string` | — | Extra classes on the `<span>`. |

---

## Variants

Implicit **per-status** styles in `STATUS_STYLES`:

| Status | Visual intent (approx.) |
|--------|-------------------------|
| `draft` | Neutral chrome |
| `sent` | Pending / attention |
| `accepted` | Success |
| `declined` | Error |
| `countered` | Info |
| `completed` | Strong / settled |

---

## Usage examples

```tsx
import { TradeStatusBadge } from "@/mca-ui";

<TradeStatusBadge status={trade.status} />
```

---

## Accessibility

- Text content is the status string — readable without color alone.
- For sortable tables, ensure column headers identify the field; the badge itself is inline text.

---

## Token usage

- Base: `inline-flex`, `rounded-mca-control`, `border`, `px-mca-sm py-mca-xs`, `text-mca-caption`, `uppercase`, `tracking-wide`, `duration-200`, `ease-mca-standard`.
- Per-status: `mca-accent`, `mca-warning`, `mca-success`, `mca-error`, `mca-info`, `mca-chrome`, borders per source.

---

## Composition

- Use in trade lists, detail headers, and notifications; pair with domain copy for user-friendly labels if you map enum → sentence elsewhere.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Pass validated `TradeStatus` from API/types. | Show only color — always show the status text. |

---

## Related

- Trading types: [`src/lib/trading/types.ts`](../../src/lib/trading/types.ts)
- [InlineSuccess](./inline-success.md) / [InlineError](./inline-error.md) — different semantics (alerts vs status chip)
