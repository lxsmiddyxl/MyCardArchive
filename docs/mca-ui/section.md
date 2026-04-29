# SectionShell

`SectionShell` — `<section>` wrapper with optional title, optional `sectionId`, and `mca-section-reveal` + vertical spacing.

**Source:** [`src/mca-ui/section.tsx`](../../src/mca-ui/section.tsx)

---

## Overview

- Root: `<section>` with optional `id={sectionId}`.
- When both `sectionId` and `title` are set, `aria-labelledby={`${sectionId}-heading`}` and the heading uses `id={`${sectionId}-heading`}`.
- If only `title` is set (no `sectionId`), the `<h2>` has no id and `aria-labelledby` is omitted.
- Default spacing: `space-y-mca-base`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `ReactNode` | — | Section heading (`<h2>`). |
| `sectionId` | `string` | — | Sets `id` on `<section>` and `${sectionId}-heading` on the title. |
| `className` | `string` | — | Section classes. |
| `children` | `ReactNode` | — | Body content. |
| *(rest)* | `HTMLAttributes<HTMLElement>` | — | Other section attributes. |

---

## Variants

None.

---

## Usage examples

```tsx
import { SectionShell, Panel } from "@/mca-ui";

<SectionShell title="Collection" sectionId="collection">
  <Panel>…</Panel>
</SectionShell>
```

Deep links: `#collection` scrolls to the section when `sectionId` is set.

---

## Accessibility

- Prefer passing **both** `title` and `sectionId` so the region has an accessible name via `aria-labelledby`.
- Avoid multiple untitled sections without landmarks if the page is long — use headings or `sectionId` consistently.

---

## Token usage

- Heading: `text-sm font-semibold uppercase tracking-wide text-mca-hint` (with dark variant).
- Spacing: `space-y-mca-base` on the section.

---

## Composition

- Wrap [`Panel`](./panel.md), metrics, or route-specific content.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `sectionId` when you need anchor links or `aria-labelledby`. | Reuse the same `sectionId` twice on one page. |

---

## Related

- [Panel](./panel.md)
- [MetricBlock](./metric-block.md)
