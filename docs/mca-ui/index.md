# MCA-UI — Component library

Internal, token-backed UI primitives for MyCardArchive. Implementation lives in [`src/mca-ui/`](../../src/mca-ui/). Import from `@/mca-ui` (barrel) or `@/mca-ui/<module>`.

**Companion doc:** [Developer Design System Handbook](../design-system/DEVELOPER_GUIDE.md) — tokens, lint guardrails, spacing, and global patterns (Phase 39).

### Phase 39 alignment

These pages describe **`src/mca-ui/`** primitives and match the handbook’s expectations: semantic **`mca-*`** Tailwind utilities (not raw palette steps), token source via **`@/styles/tokens`**, component shells like **`.mca-panel`** / **`.mca-input`** in globals, and interactive motion **`duration-200`** + **`ease-mca-standard`**. Prefer importing UI from **`@/mca-ui`** as in the handbook’s primitive guidance.

---

## Principles

- **Semantic `mca-*` utilities** for color, spacing, radius, and shadows — not raw Tailwind palette steps.
- **`className` passthrough** on primitives via `cn()` where applicable; compose with layout utilities (`flex`, `grid`, breakpoints).
- **Accessibility** — each component page lists roles, labels, and focus behavior; inline SVGs follow Phase 32 patterns.

---

## Package contents

| Component | Doc | Role |
|-----------|-----|------|
| `Button` | [button.md](./button.md) | Primary actions, variants |
| `Field` | [field.md](./field.md) | Label + optional hint + error + control slot |
| `Input` | [input.md](./input.md) | Text input with `.mca-input` base |
| `Panel` | [panel.md](./panel.md) | `.mca-panel` bordered surface |
| `Card` | [card.md](./card.md) | Card-shaped surface |
| `SectionShell` | [section.md](./section.md) | Section + optional heading |
| `ChartContainer` | [chart-container.md](./chart-container.md) | Chart frame |
| `MetricGrid` / `MetricBlock` | [metric-block.md](./metric-block.md) | Dashboard metrics |
| `NavDropdown` | [nav-dropdown.md](./nav-dropdown.md) | Header dropdown menu |
| `NavToolbarButton` | [nav-toolbar-button.md](./nav-toolbar-button.md) | Toolbar-styled button |
| `MenuRowButton` | [menu-row-button.md](./menu-row-button.md) | Full-width menu row |
| `InlineError` | [inline-error.md](./inline-error.md) | Inline error alert |
| `InlineSuccess` | [inline-success.md](./inline-success.md) | Inline success status |
| `LoadingButton` | [loading-button.md](./loading-button.md) | Button + loading state |
| `ModalBase` | [modal-base.md](./modal-base.md) | Accessible modal shell |
| `Icon` | [icon.md](./icon.md) | Next/Image icon wrapper |
| `AnimatedNumber` | [animated-number.md](./animated-number.md) | Animated numeric display |
| `RemoteCardThumb` | [remote-card-thumb.md](./remote-card-thumb.md) | Card image thumb |
| `TradeStatusBadge` | [trade-status-badge.md](./trade-status-badge.md) | Trade status chip |

---

## Import paths

```tsx
import { Button, Field, Panel } from "@/mca-ui";
// or
import { Button } from "@/mca-ui/button";
```

Legacy [`@/components/ui/*`](../../src/components/ui/) re-exports still work but new code should prefer `@/mca-ui`.

---

## Related

- [DEVELOPER_GUIDE.md](../design-system/DEVELOPER_GUIDE.md) — tokens, ESLint, spacing scale
- [`src/mca-ui/index.ts`](../../src/mca-ui/index.ts) — export list
