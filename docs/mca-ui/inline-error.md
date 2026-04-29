# InlineError

`InlineError` — Inline alert block for errors: optional warning icon, `role="alert"`, flex row with border and error surface tokens.

**Source:** [`src/mca-ui/inline-error.tsx`](../../src/mca-ui/inline-error.tsx)

---

## Overview

- Renders nothing if `children` is null, `false`, or `""`.
- Default: `<p role="alert">` with error border/background/text and optional [`Icon`](./icon.md) (`warning.svg`).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Message (ignored when empty). |
| `className` | `string` | `''` | Extra classes. |
| `id` | `string` | — | For `aria-describedby` from forms. |
| `showIcon` | `boolean` | — | Prefix with warning icon (decorative `alt=""`). |

---

## Variants

**Icon:** with or without `showIcon`.

---

## Usage examples

```tsx
import { InlineError } from "@/mca-ui";

<InlineError showIcon>{submitError}</InlineError>

<Field id="email" label="Email" error={errors.email}>
  <Input id="email" />
</Field>
```

For field-level errors, prefer [`Field`](./field.md)’s `error` prop; use `InlineError` for form-level or section-level messages.

---

## Accessibility

- **`role="alert"`** — assertive announcements when content appears.
- **`id`** — associate with inputs via `aria-describedby` when the error is not inside [`Field`](./field.md).
- Icon is decorative (`alt=""`).

---

## Token usage

- Layout: `flex items-center gap-mca-sm`, `rounded-mca-block`, `px-mca-compact py-mca-tight`, `text-sm`.
- Colors: `border-mca-error-border/50`, `bg-mca-error-surface/25`, `text-mca-error-text`.

---

## Composition

- Pair with [`Field`](./field.md) for control errors, or use standalone above forms.
- [`InlineSuccess`](./inline-success.md) for non-error status.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use for user-visible failure messages. | Duplicate the same text in `Field.error` and a global `InlineError`. |

---

## Related

- [InlineSuccess](./inline-success.md)
- [Field](./field.md)
- [Icon](./icon.md)
