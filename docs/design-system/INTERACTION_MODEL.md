# Interaction model (MCA UI)

Canonical patterns for **buttons, modals, lists, forms, navigation**, and **motion**. Implementation lives in `@/mca-ui` and `src/lib/ui/use-modal-mount.ts`. Tokens: `mca-*` utilities; motion: **`duration-200`** + **`ease-mca-standard`** unless noted.

## Buttons

| Role | Primitive | Notes |
|------|-----------|--------|
| Primary CTA | `Button variant="primary"` | Accent fill; one primary action per surface. |
| Secondary | `Button variant="secondary"` | Bordered chrome; alternate confirmations. |
| Tertiary / subtle text | `Button variant="tertiary"` or **`variant="subtle"`** (alias) | Low-emphasis actions. |
| Destructive | `Button variant="destructive"` | Remove, decline, irreversible. |

Shared chrome: `transition-[…] duration-200 ease-mca-standard`, `focus-visible:ring-2`, `active:scale-[0.98]`.

## Modals

- **Mount:** `useModalMount(isOpen, 200)` — 200ms exit matches panel.
- **Backdrop / panel:** `modalBackdropClasses` / `modalPanelClasses` from `@/lib/ui/use-modal-mount` (`ease-mca-standard`).
- **A11y:** `ModalBase` — `role="dialog"`, `aria-labelledby`, focus trap, Escape, scroll lock.
- **Close:** Prefer explicit close control; `blockClose` when a destructive inline action is in flight.

## Lists

- **Long vertical lists:** `McaVirtualList` (`@/components/ui/mca-virtual-list`) + bounded `max-h-*` scrollport.
- **Grids / inventory:** Windowed grids (`inventory-list-section`) when count exceeds threshold.
- **Pagination:** Prefer URL state for bookmarking; infinite scroll only where product explicitly needs it.

## Forms

- **Field + label:** `Field` + `mca-input` / native controls with `id` + `htmlFor`.
- **Errors:** `InlineError` near the field; `role="alert"` for page-level failures.
- **Success:** `InlineSuccess` for completed mutations; avoid duplicate toast + inline for the same event.

## Navigation

- **Back:** `NavBackLink` (`@/mca-ui/nav-back-link`) for “← Previous context” with consistent tokens.
- **Hierarchy:** `Breadcrumb` (`@/mca-ui/breadcrumb`) for section > page > entity.
- **Tabs:** Use `border-b` + `aria-selected` pattern; keep focus order logical.

## Micro-interactions

- Hover: subtle background/border only; no layout jump.
- Focus: always `focus-visible:ring-*`; never remove outline without replacement.
- Loading: `role="status"` + `aria-busy` where async; skeletons match layout to reduce CLS.
