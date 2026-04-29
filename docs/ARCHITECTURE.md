# Architecture (index)

There is no single long-form architecture specification in this repository. Use these entry points:

| Area | Location |
|------|----------|
| Design system & MCA-UI usage | `docs/design-system/DEVELOPER_GUIDE.md`, `docs/mca-ui/` |
| App Router, API routes, middleware | Source under `src/app/`; middleware: `src/middleware.ts` |
| Operations & observability | `docs/runbooks/` (start with `observability.md`) |
| Deployments & rollback | `docs/deployments/checklist.md`, `docs/deployments/rollback.md` |

For database and Supabase types, see `src/lib/supabase/` and project-specific migration docs if present in your fork.

---

## Realtime (Supabase)

- **Client multiplexing & subscriptions:** `src/lib/realtime/channels.ts` (`subscribeToTrades`, `subscribeToTradeMessages`, `subscribeToTradeItems`, matching index, notifications, activity, presence).
- **Trade merge helpers:** `src/lib/trading/trade-realtime.ts` — message row merge vs debounced refetch for `trade_items` sides.
- **Trade detail UI:** `src/components/trading/trade-detail-client.tsx`.
- **DB publication & ops:** `docs/runbooks/realtime.md`, migrations `037`–`039` under `supabase/migrations/`.

---

## Telemetry (Phase 46)

- **Browser:** `mcaLog` (`src/lib/logging/mca-log-client.ts`) → `POST /api/log` → `pushMcaTelemetry` + minute-bucket aggregation for `GET /api/internal/telemetry`.
- **Server:** `mca-log-server.ts` for API routes; optional Pino bridge in `src/lib/telemetry/logger.ts`.
- **Tab correlation id:** `getTelemetryConnectionId` in `src/lib/telemetry/client-telemetry.ts`.
- **Context refs (hooks):** `src/lib/telemetry/use-mca-context-ref.ts` avoids unstable `McaLogContext` identity in effect deps.

---

## Grading (heuristic pipeline)

- **Core:** `src/lib/grading/index.ts` — deterministic `heuristic-v1` output until ML is wired.
- **API:** `src/app/api/cards/[id]/grade/route.ts` — ownership check, `mcaLog.event` for `grading.heuristic.*`.
- **UI:** `src/components/grading/*`.

---

## Tier artwork (Phase 25)

- **Tokens:** `ARTWORK_TIER_STRIPS`, `getTierStripPath` in `src/lib/ui/artwork-tokens.ts`.
- **Public assets:** `/public/artwork/tier/strip-{free,pro,elite}.svg`.
- **UI:** `TierArtworkStrip` in `src/components/artwork/artwork-surfaces.tsx`; `/tier` passes `tier_slug`.

---

## Route errors & logging

- **Segment `error.tsx`:** Many routes use `src/components/logged-route-error.tsx` so client `mcaLog.error` fires on segment failures (`route.segment.error`).
- **MCA UI boundary:** `src/mca-ui/error-boundary.tsx` logs `ui.errorBoundary` for wrapped subtrees.
