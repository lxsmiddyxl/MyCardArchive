# InlineSuccess

`InlineSuccess` — Inline status block for success: optional check icon, `role="status"`, success surface tokens.

**Source:** [`src/mca-ui/inline-success.tsx`](../../src/mca-ui/inline-success.tsx)

---

## Overview

- Renders nothing if `children` is null, `false`, or `""`.
- Default: `<p role="status">` with success border/background/text and optional [`Icon`](./icon.md) (`check.svg`).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Message (ignored when empty). |
| `className` | `string` | `''` | Extra classes. |
| `showIcon` | `boolean` | — | Prefix with check icon (decorative `alt=""`). |

---

## Variants

**Icon:** with or without `showIcon`.

---

## Usage examples

```tsx
import { InlineSuccess } from "@/mca-ui";

<InlineSuccess showIcon>Profile saved.</InlineSuccess>
```

---

## Accessibility

- **`role="status"`** — polite updates; avoid flooding on every keystroke.
- No `id` prop in the component — add via `className` wrapper or wrap in an element with `id` if you need `aria-describedby` linkage.

---

## Token usage

- Layout: `flex`, `gap-mca-sm`, `rounded-mca-block`, `px-mca-compact py-mca-tight`, `text-sm`.
- Colors: `border-mca-success-surface-border/45`, `bg-mca-success-surface/20`, `text-mca-success-ink`.

---

## Composition

- Use after successful mutations; pair with [`InlineError`](./inline-error.md) for failure on the same surface.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use for completion messages. | Use for every background poll — prefer subtle UI or toasts per product patterns. |

---

## Related

- [InlineError](./inline-error.md)
- [Field](./field.md)
