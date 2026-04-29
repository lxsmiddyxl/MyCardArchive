# Input

`Input` — Text input using the shared `.mca-input` class. Also exports `mcaInputClassName` for composing custom elements.

**Source:** [`src/mca-ui/input.tsx`](../../src/mca-ui/input.tsx)

---

## Overview

- Renders a native `<input>` with `className` merged from **`mcaInputClassName`** (includes `mca-input` and token borders/text).
- Export **`mcaInputClassName`** for `<textarea>` or other elements that should match input styling.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | Merged after `mcaInputClassName` (includes `mca-input`). |
| *(rest)* | `InputHTMLAttributes<HTMLInputElement>` | — | `id`, `type`, `name`, `disabled`, `aria-*`, etc. |

---

## Variants

None — use `type`, `inputMode`, and `autoComplete` for behavior variants.

---

## Usage examples

```tsx
import { Input, mcaInputClassName } from "@/mca-ui";

<Input id="search" type="search" placeholder="Search cards…" />

<textarea className={cn(mcaInputClassName, "min-h-24")} />
```

---

## Accessibility

- Provide `id` matching [`Field`](./field.md) label `htmlFor`.
- Use `type="email"`, `type="search"`, `inputMode="numeric"` as appropriate.
- Do not remove visible focus styles; `mca-input` includes focus ring behavior aligned with globals.

---

## Token usage

- `.mca-input` — border, background, radius, focus ring (see `globals.css` / Tailwind `@layer components`).
- Prefer semantic borders (`border-mca-border`) via the component class, not ad-hoc colors.

---

## Composition

- Wrap with [`Field`](./field.md) for label + error pattern.
- For file uploads or rich editors, use native or app components but reuse `mcaInputClassName` for visual consistency where it fits.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `autoComplete` for known field types. | Use `placeholder` as the only label. |
| Reuse `mcaInputClassName` for matching textareas. | Copy-paste raw border classes that drift from `.mca-input`. |

---

## Related

- [Field](./field.md)
- [Panel](./panel.md) — surfaces that contain forms
- [Developer Handbook](../design-system/DEVELOPER_GUIDE.md)
