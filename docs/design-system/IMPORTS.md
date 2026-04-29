# Import conventions (MCA UI)

## Canonical paths

| Import from | Use for |
|-------------|---------|
| **`@/mca-ui/*`** | Design-system primitives: `button`, `field`, `panel`, `icon`, `inline-error`, `inline-success`, `loading-button`, `remote-card-thumb`, `modal-base`, `error-boundary`, `nav-dropdown`, etc. |
| **`@/components/ui/mca-virtual-list`** | `McaVirtualList` (TanStack Virtual wrapper + telemetry) — lives only under `components/ui` until moved. |
| **`@/components/ui/skeleton`** | App-specific skeleton compositions (`TradeListSkeleton`, …). |
| **`@/styles/tokens`** | Semantic tokens for non-Tailwind contexts. |

`@/components/ui/*.tsx` files that are **one-line re-exports** of `@/mca-ui` exist for backwards compatibility; **new and refactored code should import from `@/mca-ui` directly** so intent is clear in reviews.

## Flows to keep consistent

Binder, deck, trade, and matching surfaces should use the same primitive imports (`@/mca-ui`) and **`mca-*` Tailwind tokens** (see `DEVELOPER_GUIDE.md`).
