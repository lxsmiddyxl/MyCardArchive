# Button

`Button` — Primary interactive control for actions. Token-backed variants; native `<button>` with focus ring and `active:scale`.

**Source:** [`src/mca-ui/button.tsx`](../../src/mca-ui/button.tsx)

---

## Overview

- Renders `<button>` with `type` defaulting to `"button"`.
- Variants: `primary`, `secondary`, `tertiary`, `destructive`.
- Base classes: `rounded-mca-control`, padding, `duration-200`, `ease-mca-standard`, focus ring with `ring-offset-mca-surface`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `'primary'` | Visual style. |
| `className` | `string` | — | Merged with `cn()`. |
| `type` | `ButtonHTMLAttributes['type']` | `'button'` | Use `submit` inside forms when appropriate. |
| `children` | `ReactNode` | **required** | Visible label. |
| *(rest)* | `ButtonHTMLAttributes` | — | `onClick`, `disabled`, `aria-*`, `data-*`, etc. |

`ButtonVariant` = `'primary' | 'secondary' | 'tertiary' | 'destructive'`.

---

## Variants

| Variant | Use |
|---------|-----|
| `primary` | Main CTA (save, continue). |
| `secondary` | Secondary actions on the same surface. |
| `tertiary` | Low-emphasis (cancel, back). |
| `destructive` | Destructive actions — pair with confirmation. |

---

## Usage examples

```tsx
import { Button } from "@/mca-ui";

<Button variant="primary">Save</Button>
<Button variant="secondary" type="submit">Submit</Button>
<Button variant="destructive" onClick={onDelete}>Delete</Button>
```

---

## Accessibility

- Native button — keyboard (Enter/Space), `focus-visible` ring.
- **Destructive:** confirm in a dialog or offer undo; do not rely on red color alone.
- **Loading:** prefer [`LoadingButton`](./loading-button.md) for async work so width stays stable and you can add `aria-busy` via props if needed.

---

## Token usage

- Variants use `mca-accent`, `mca-chrome`, `mca-error-*`, borders, and `shadow-mca-panel` as defined in source.
- **Radius:** `rounded-mca-control`.
- **Motion:** `duration-200`, `ease-mca-standard`, `active:scale-[0.98]`.

---

## Composition

- Use [`LoadingButton`](./loading-button.md) when showing a spinner; pass matching `className` so visuals align with `Button` (LoadingButton does not apply variant styles by itself).

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| One clear primary action per region. | Use `primary` for every control in a form. |
| Pass `aria-label` for icon-only buttons. | Remove or override focus styles without a replacement. |

---

## Related

- [LoadingButton](./loading-button.md)
- [NavToolbarButton](./nav-toolbar-button.md)
- [MenuRowButton](./menu-row-button.md)
- [Developer Handbook](../design-system/DEVELOPER_GUIDE.md)
