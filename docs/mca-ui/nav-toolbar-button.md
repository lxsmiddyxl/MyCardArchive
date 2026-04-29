# NavToolbarButton

`NavToolbarButton` — Thin wrapper around `<button>` applying `mca-header-toolbar-control` for header toolbar triggers (icons, compact actions).

**Source:** [`src/mca-ui/nav-toolbar-button.tsx`](../../src/mca-ui/nav-toolbar-button.tsx)

---

## Overview

- Defaults `type="button"`.
- Passes through all native `ButtonHTMLAttributes`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `ButtonHTMLAttributes['type']` | `'button'` | — |
| `className` | `string` | — | Merged after base toolbar class. |
| *(rest)* | `ButtonHTMLAttributes<HTMLButtonElement>` | — | `aria-label`, `onClick`, `disabled`, etc. |

---

## Variants

None — visual chrome is entirely from `mca-header-toolbar-control` + `className`.

---

## Usage examples

```tsx
import { NavToolbarButton } from "@/mca-ui";
import { Icon } from "@/mca-ui/icon";

<NavToolbarButton aria-label="Notifications" onClick={openBell}>
  <Icon src="/icons/activity/bell.svg" alt="" />
</NavToolbarButton>
```

---

## Accessibility

- **Icon-only:** always set `aria-label` on the button.
- Do not rely on `Icon` `alt` for the control name — the button label is authoritative.

---

## Token usage

- Inherits global **header toolbar** styles (chrome, hover, focus) from `mca-header-toolbar-control`.

---

## Composition

- Often used next to [`NavDropdown`](./nav-dropdown.md) triggers; dropdown uses the same base class on its trigger internally.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use for header chrome only. | Use for primary form CTAs — use [`Button`](./button.md). |

---

## Related

- [NavDropdown](./nav-dropdown.md)
- [Icon](./icon.md)
- [Button](./button.md)
