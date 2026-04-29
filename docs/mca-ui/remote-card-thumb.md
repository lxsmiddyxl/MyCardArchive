# RemoteCardThumb

`RemoteCardThumb` — `next/image` with `fill`, blur placeholder, and **conditional optimization**: Supabase-hosted URLs use default optimization; other HTTPS URLs use `unoptimized`.

**Source:** [`src/mca-ui/remote-card-thumb.tsx`](../../src/mca-ui/remote-card-thumb.tsx)

---

## Overview

- **Parent must** be `position: relative` with explicit size when using `fill`.
- `placeholder="blur"` with a tiny embedded PNG `blurDataURL`.
- `isSupabaseHosted(src)` checks hostname ends with `supabase.co`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | **required** | Image URL. |
| `alt` | `string` | **required** | Describe the card for assistive tech. |
| `sizes` | `string` | **required** | Responsive `sizes` for `fill` layout. |
| `className` | `string` | — | Defaults to `object-cover` when omitted. |
| `priority` | `boolean` | — | LCP / above-the-fold hints. |
| `draggable` | `boolean` | — | Drag-and-drop. |
| `onDragStart` | `DragEventHandler<HTMLImageElement>` | — | — |
| `onDragEnd` | `DragEventHandler<HTMLImageElement>` | — | — |

---

## Variants

None — behavior differs by host (Supabase vs other) automatically.

---

## Usage examples

```tsx
import { RemoteCardThumb } from "@/mca-ui";

<div className="relative aspect-[63/88] w-full overflow-hidden rounded-mca-block">
  <RemoteCardThumb
    src={imageUrl}
    alt={`${name} · ${setName}`}
    sizes="(max-width: 768px) 50vw, 200px"
    priority={isAboveFold}
  />
</div>
```

---

## Accessibility

- **`alt` is required** — describe the Pokémon card (name, set) meaningfully; avoid empty `alt` unless the image is purely decorative in a redundant context.

---

## Token usage

- Component does not set border/radius — apply on the wrapper (`rounded-mca-block`, etc.).

---

## Composition

- Place inside [`Card`](./card.md) or binder cell wrappers; ensure aspect ratio comes from the parent.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Pass accurate `sizes` for performance. | Omit `alt` for identifiable card art. |

---

## Related

- [Card](./card.md)
- [Icon](./icon.md)
