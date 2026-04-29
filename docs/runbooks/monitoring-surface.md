# Runbook: Monitoring surfaces (grading, realtime, matching, billing)

Use this map when wiring dashboards or alerting. All paths assume Phase 46 **`mcaLog`** / server logs unless noted.

## Grading

- **API:** `POST/GET /api/cards/[id]/grade` — server logs `grading.heuristic.get` / `grading.heuristic.post` (`src/app/api/cards/[id]/grade/route.ts`).
- **Client UI:** Grading panels under `src/components/grading/`; errors surface as standard route/UI errors.

## Realtime

- **Client throughput:** `realtime.{name}.throughput` via `useRealtimeEventCounter` (`src/lib/telemetry/use-realtime-event-counter.ts`).
- **Presence / mux:** `realtime.presence.*` events from `src/lib/realtime/channels.ts` (see `mcaLog.event` names).
- **Ops:** `docs/runbooks/realtime.md`, `GET /api/health/realtime`, `npm run stress:realtime`.

## Matching

- **Dashboard:** Matching index subscriptions + debounced reload (`src/components/matching/matching-dashboard-client.tsx`); debug logs under `log.matching` (`src/lib/logging/log.ts`).
- **Health:** Diagnostics registry includes matching-related checks when enabled (`src/lib/diagnostics/`).

## Billing

- **Stripe webhooks:** `src/app/api/billing/webhook/route.ts` — use host logs + Stripe dashboard for payment failures.
- **Checkout / portal:** `src/app/api/billing/checkout`, `portal` — standard `defineRoute` error logging.

## Related

- **Predictive overlay:** `GET /api/health/predictive`, `docs/predictive/predictive-runbook.md`.
- **Load / stability:** `docs/load/load-overview.md`, `npm run stability:run`.
