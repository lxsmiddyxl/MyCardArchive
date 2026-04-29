# MenuRowButton

`MenuRowButton` — Full-width `<button role="menuitem">` for account menus and dropdown rows (sign out, settings).

**Source:** [`src/mca-ui/menu-row-button.tsx`](../../src/mca-ui/menu-row-button.tsx)

---

## Overview

- Base: full width, left-aligned text, `rounded-mca-control`, focus ring, `duration-200`, `ease-mca-standard`.
- **`variant`:** `default` (neutral hover) or `danger` (error-colored hover text).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'danger'` | `'default'` | Destructive row styling. |
| `type` | `ButtonHTMLAttributes['type']` | `'button'` | — |
| `className` | `string` | — | Extra classes. |
| *(rest)* | `ButtonHTMLAttributes<HTMLButtonElement>` | — | `onClick`, `disabled`, `children`, etc. |

---

## Variants

| Variant | Use |
|---------|-----|
| `default` | Normal menu actions. |
| `danger` | Sign out, delete, or other cautious actions (still confirm in flow if needed). |

---

## Usage examples

```tsx
import { MenuRowButton, NavDropdown, useNavDropdownClose } from "@/mca-ui";

// Inside NavDropdown menu:
<MenuRowButton type="button" onClick={onSettings}>Settings</MenuRowButton>
<MenuRowButton variant="danger" type="button" onClick={onSignOut}>
  Sign out
</MenuRowButton>
```

---

## Accessibility

- **`role="menuitem"`** — use inside `role="menu"` (e.g. [`NavDropdown`](./nav-dropdown.md)) for arrow-key roving focus.
- **Disabled:** `disabled:opacity-50`; ensure `aria-disabled` is not needed if using native `disabled`.

---

## Token usage

- Padding: `px-mca-compact py-mca-sm`; text `text-sm font-medium text-mca-ink-body`.
- Focus: `focus-visible:ring-2 focus-visible:ring-mca-focus/50` with offset `ring-offset-mca-surface`.
- **Danger hover:** `hover:text-mca-error-text`.

---

## Composition

- Primary consumer: [`NavDropdown`](./nav-dropdown.md) panels alongside `NavDropdownLink`.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `danger` for sign-out / destructive row actions. | Use outside a menu when a standard [`Button`](./button.md) is clearer. |

---

## Related

- [NavDropdown](./nav-dropdown.md)
- [Button](./button.md)
