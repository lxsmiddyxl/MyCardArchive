# ModalBase

`ModalBase` — Accessible modal shell: backdrop click, Escape (unless `blockClose`), body scroll lock, focus trap, return focus to trigger on close. Uses `useModalMount` for enter/exit timing.

**Source:** [`src/mca-ui/modal-base.tsx`](../../src/mca-ui/modal-base.tsx)

---

## Overview

- Renders `role="dialog"` `aria-modal="true"` with optional `aria-describedby`.
- **Requires** either `title` **or** `ariaLabel` — throws if both are missing (for `aria-labelledby` / label).
- Header: optional visible `title` as `<h2 id={titleId}>`, or sr-only `ariaLabel` when title omitted.
- Close control in header; backdrop is a separate `button` with `aria-label="Close dialog"`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | **required** | Controls mount and animation. |
| `onClose` | `() => void` | **required** | Called on backdrop/Escape/header close (unless blocked). |
| `children` | `ReactNode` | **required** | Scrollable body (`[data-modal-body]`). |
| `title` | `string` | — | Visible dialog title; sets `aria-labelledby`. |
| `ariaLabel` | `string` | — | **Required if no `title`** — dialog accessible name (sr-only). |
| `descriptionId` | `string` | — | Optional `aria-describedby` target. |
| `panelClassName` | `string` | `''` | Dialog panel classes. |
| `bodyClassName` | `string` | `''` | Inner scroll area classes. |
| `footer` | `ReactNode` | — | Footer row (e.g. action buttons). |
| `align` | `'center' \| 'end'` | `'center'` | `end` = bottom sheet–like on mobile, centered from `sm`. |
| `zClassName` | `string` | `'z-[100]'` | Stacking context for the overlay root. |
| `blockClose` | `boolean` | `false` | Disables Escape, backdrop, and header close. |
| `closeButtonAriaLabel` | `string` | `'Close dialog'` | Header close button label. |

---

## Variants

**Alignment:** `center` (default) vs `end` (mobile-friendly bottom alignment).

---

## Usage examples

```tsx
import { ModalBase, Button } from "@/mca-ui";

<ModalBase
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Confirm delete"
  footer={
    <>
      <Button variant="tertiary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={onDelete}>Delete</Button>
    </>
  }
>
  <p className="p-mca-md text-mca-ink-body">This cannot be undone.</p>
</ModalBase>
```

Titleless dialog (rare):

```tsx
<ModalBase isOpen={open} onClose={onClose} ariaLabel="Crop image">
  …
</ModalBase>
```

---

## Accessibility

- **Name:** `title` or `ariaLabel` is mandatory.
- **Focus:** moves into modal body focusables after open; Tab cycles within the dialog.
- **Escape / backdrop:** call `onClose` unless `blockClose` (use for destructive confirmations only with clear in-modal actions).
- Backdrop button is focusable for pointer users; focus trap applies to the dialog panel subtree.

---

## Token usage

- Overlay: `fixed inset-0`, `p-mca-md`, backdrop `bg-black/65`, `backdrop-blur-[2px]`, `duration-200`.
- Panel: `rounded-mca-card`, `border-mca-border`, `bg-mca-surface-elevated/95`, `shadow-mca-card`, `max-h-[90vh]`.
- Header/footer: `border-mca-border`, padding `px-mca-lg py-mca-md` / `p-mca-md`.

---

## Composition

- Put primary actions in `footer`; use [`Button`](./button.md) variants.
- First focusable in `[data-modal-body]` receives focus when present.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Provide `descriptionId` when body text should be described for AT. | Open without `title` or `ariaLabel`. |
| Use `blockClose` only when necessary (e.g. forced acknowledgment). | Nest another modal without a documented pattern. |

---

## Related

- [Button](./button.md)
- [LoadingButton](./loading-button.md)
- [Panel](./panel.md) — non-modal surfaces
