# LoadingButton & LoadingSpinner

`LoadingButton` — Button that keeps **stable width** while loading: invisible measurement row + absolutely positioned visible row with spinner + screen-reader “Loading” text.  
`LoadingSpinner` — Small inline SVG spinner (`aria-hidden`).

**Source:** [`src/mca-ui/loading-button.tsx`](../../src/mca-ui/loading-button.tsx)

---

## Overview

- When `isLoading` is true, the button is `disabled` and shows `LoadingSpinner` + `<span className="sr-only">Loading</span>`.
- **Does not** apply [`Button`](./button.md) variant classes — pass the full visual `className` you need (often matching `Button` base + variant).

---

## Props

### LoadingButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | `false` | Shows spinner and disables. |
| `disabled` | `boolean` | — | Disables when true or when loading. |
| `children` | `ReactNode` | **required** | Label used for width measurement. |
| `className` | `string` | `''` | **Required** for styling — typically same classes as `Button`. |
| `type` | `ButtonHTMLAttributes['type']` | `'button'` | — |
| *(rest)* | `Omit<ButtonHTMLAttributes, 'children'>` | — | `onClick`, `aria-*`, etc. |

### LoadingSpinner

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Extra classes on the SVG. |

---

## Variants

None — styling is entirely from `className` on `LoadingButton`.

---

## Usage examples

```tsx
import { LoadingButton, Button } from "@/mca-ui";
import { cn } from "@/lib/ui/cn";

// Reuse Button look: import variant classes or duplicate the needed class string from Button usage.
const btnClass = cn(
  "inline-flex items-center justify-center gap-mca-sm rounded-mca-control px-mca-compact py-mca-sm text-sm font-semibold …",
);

<LoadingButton isLoading={pending} className={btnClass} type="submit">
  Save changes
</LoadingButton>
```

In practice, keep one shared `className` constant next to `Button` usage for consistency.

---

## Accessibility

- **SR-only “Loading”** when spinning — supplement with `aria-busy` on the button if your pattern requires it (pass through `...rest`).
- Disabled state prevents double submission.

---

## Token usage

- Spinner: `size-4`, `animate-spin`, `text-current`, `duration-200`, `ease-mca-standard`.
- Layout: invisible/absolute spans with `gap-mca-sm`, `px-mca-trace`.

---

## Composition

- Pair with form submit handlers; use [`Button`](./button.md) when no loading state is needed.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Pass the same width-defining classes as your primary `Button`. | Expect variant props — compose `className` instead. |

---

## Related

- [Button](./button.md)
- [Icon](./icon.md)
