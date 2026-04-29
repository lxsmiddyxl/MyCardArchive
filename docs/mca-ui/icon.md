# Icon

`Icon` — Thin wrapper around `next/image` for fixed-size SVG icons (`sm` | `md` | `lg`). Decorative by default (`alt=""` → `aria-hidden`).

**Source:** [`src/mca-ui/icon.tsx`](../../src/mca-ui/icon.tsx)

---

## Overview

- **`alt` default `""`:** treated as decorative — `aria-hidden` on the image.
- **Non-empty `alt`:** meaningful icon — no `aria-hidden`; use a short name when the icon conveys information without adjacent text.
- **`unoptimized`** is always set (suitable for SVG assets in `/public`).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | **required** | Path under `public` or remote URL per Next config. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Maps to pixel dimensions and Tailwind size classes. |
| `alt` | `string` | `''` | Empty = decorative; otherwise short accessible name. |
| `className` | `string` | `''` | Extra classes (`shrink-0`, opacity, etc.). |

**Dimensions:** `sm` → 20px (`h-5 w-5`), `md` → 24px (`h-6 w-6`), `lg` → 32px (`h-8 w-8`).

---

## Variants

**Size** only — `sm` / `md` / `lg`.

---

## Usage examples

```tsx
import { Icon } from "@/mca-ui";

<Icon src="/icons/ui/check.svg" size="sm" alt="" />

<Icon src="/icons/system/alert.svg" size="md" alt="Warning" />
```

Adjacent text + decorative icon:

```tsx
<button type="button" aria-label="Close">
  <Icon src="/icons/ui/close.svg" alt="" />
</button>
```

---

## Accessibility

- **Decorative:** keep `alt=""` when a visible label or `aria-label` on the parent carries meaning.
- **Standalone meaning:** set meaningful `alt` **or** put text next to the icon — avoid redundant `alt` + identical visible text.

---

## Token usage

- No color tokens inside `Icon` — inherits `currentColor` / parent styles via `className`.

---

## Composition

- Used inside [`InlineError`](./inline-error.md), [`InlineSuccess`](./inline-success.md), [`ModalBase`](./modal-base.md), etc.
- Pair with [`NavToolbarButton`](./nav-toolbar-button.md) using `aria-label` on the button.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `alt=""` for purely decorative icons next to text. | Rely on icon color alone for status — include text. |

---

## Related

- [NavToolbarButton](./nav-toolbar-button.md)
- [InlineError](./inline-error.md)
