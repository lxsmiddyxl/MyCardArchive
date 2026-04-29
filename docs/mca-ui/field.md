# Field

`Field` — Groups a required string `label`, optional `hint`, optional `error`, and a single control (`children`). Associates the label with the control via `htmlFor={id}`.

**Source:** [`src/mca-ui/field.tsx`](../../src/mca-ui/field.tsx)

---

## Overview

- Renders a vertical stack with `space-y-mca-micro`.
- Label is always a `<label htmlFor={id}>`.
- Optional hint uses `id={`${id}-hint`}` for `aria-describedby` wiring from inputs.
- When `error` is truthy, an error `<p>` renders with `id={`${id}-error`}` and `role="alert"`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Passed to `htmlFor`; must match the child input `id`. |
| `label` | `string` | **required** | Visible label (uppercase styling in UI). |
| `hint` | `string` | — | Helper text; receives `${id}-hint`. |
| `error` | `string \| null` | — | Validation message; triggers error row. |
| `disabled` | `boolean` | — | Dims the label when the field is disabled. |
| `className` | `string` | — | Wrapper `className`. |
| `children` | `ReactNode` | **required** | The form control (e.g. [`Input`](./input.md)). |

---

## Variants

None — single layout.

---

## Usage examples

```tsx
import { Field, Input } from "@/mca-ui";

<Field id="email" label="Email" hint="We never share your email.">
  <Input id="email" type="email" autoComplete="email" aria-describedby="email-hint" />
</Field>

<Field id="name" label="Display name" error={errors.name ?? null}>
  <Input id="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
</Field>
```

Wire `aria-describedby` / `aria-invalid` on the control to match `hint` and `error` ids for full SR support.

---

## Accessibility

- **Label:** native `<label>` + `id` on control.
- **Error:** `role="alert"` on the error paragraph — screen readers announce when `error` becomes non-empty.
- **Hint:** connect with `aria-describedby={`${id}-hint`}` on the input when hint is present.

---

## Token usage

- Label: `text-mca-ink-subtle`, uppercase tracking.
- Hint: `text-mca-hint`.
- Error: `text-mca-error-accent`, `text-sm`.

---

## Composition

- Pair with [`Input`](./input.md) or custom controls that honor `id` and ARIA describedby ids.
- Page-level banners: use [`InlineError`](./inline-error.md) / [`InlineSuccess`](./inline-success.md) instead of `Field` when the message is not tied to one control.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Pass stable `id` values. | Put multiple inputs inside one `Field`. |
| Mirror hint/error ids on the control with `aria-describedby`. | Rely on color alone for errors — include text in `error`. |

---

## Related

- [Input](./input.md)
- [InlineError](./inline-error.md)
- [Button](./button.md)
