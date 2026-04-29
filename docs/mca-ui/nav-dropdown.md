# NavDropdown & NavDropdownLink

`NavDropdown` — Client dropdown: trigger button + floating `role="menu"` panel with outside click and Escape handling.  
`NavDropdownLink` — Next.js `Link` styled as `role="menuitem"`; closes parent on navigate.  
`useNavDropdownClose` — Returns close callback when rendered inside an open menu (for custom items).

**Source:** [`src/mca-ui/nav-dropdown.tsx`](../../src/mca-ui/nav-dropdown.tsx)

---

## Overview

- Trigger: `aria-expanded`, `aria-haspopup`, `aria-controls`, optional `aria-label` for icon-only triggers.
- Menu: `role="menu"`, `aria-labelledby` trigger id, arrow key navigation among `[role="menuitem"]` elements, Home/End.
- **MenuRowButton** and **NavDropdownLink** expose `role="menuitem"` for roving focus collection.

---

## Props

### NavDropdown

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trigger` | `ReactNode` | **required** | Visible trigger content. |
| `active` | `boolean` | — | Active styles on trigger when route matches. |
| `align` | `'left' \| 'right'` | `'left'` | Horizontal alignment of the panel. |
| `menuClassName` | `string` | — | Panel classes. |
| `triggerClassName` | `string` | — | Trigger button classes. |
| `ariaLabel` | `string` | — | **Required** when trigger has no visible text. |
| `children` | `ReactNode` | **required** | Menu contents (menuitems). |

### NavDropdownLink

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `string` | **required** | Next.js route. |
| `active` | `boolean` | — | Active row styles. |
| `onNavigate` | `() => void` | — | Called after close. |
| `children` | `ReactNode` | — | Row label. |

### useNavDropdownClose

Returns `(() => void) | null` — call to close the parent dropdown from a custom child.

---

## Variants

**Alignment:** `left` vs `right` for the floating panel.

---

## Usage examples

```tsx
import { NavDropdown, NavDropdownLink, MenuRowButton, useNavDropdownClose } from "@/mca-ui";

<NavDropdown
  trigger={<span>Account</span>}
  align="right"
  menuClassName="min-w-[14rem]"
>
  <NavDropdownLink href="/profile">Profile</NavDropdownLink>
  <MenuRowButton type="button" onClick={signOut}>Sign out</MenuRowButton>
</NavDropdown>
```

---

## Accessibility

- **Trigger:** must have visible text or `ariaLabel`.
- **Menu:** focus moves to first menuitem on open; Escape closes and returns focus to trigger.
- **Custom rows:** use `MenuRowButton` or `NavDropdownLink` so items match `[role="menuitem"]:not([disabled])`.

---

## Token usage

- Trigger: `mca-header-toolbar-control`, open state `bg-mca-chrome/80 text-mca-ink-strong`.
- Panel: `rounded-mca-card`, `border-mca-border-subtle`, `bg-mca-surface`, `py-mca-micro`, `shadow-mca-card`, `mt-mca-micro`.
- Links: `rounded-mca-control`, `px-mca-compact`, `py-mca-sm`, focus ring `ring-mca-focus/50`, `duration-200`, `ease-mca-standard`.

---

## Composition

- Use with [`NavToolbarButton`](./nav-toolbar-button.md) for consistent header chrome where appropriate.
- [`MenuRowButton`](./menu-row-button.md) for destructive actions (`variant="danger"`).

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `menuitem` rows inside the panel. | Put non-focusable plain text as the only focus target — use buttons/links. |

---

## Related

- [MenuRowButton](./menu-row-button.md)
- [NavToolbarButton](./nav-toolbar-button.md)
- [Developer Handbook](../design-system/DEVELOPER_GUIDE.md)
