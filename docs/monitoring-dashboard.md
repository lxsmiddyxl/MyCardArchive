# Monitoring dashboard (operations)

Use these JSON endpoints (authenticated or internal as noted) to observe MyCardArchive in production. Pair with your host’s uptime checks and log aggregation.

## Core health

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/core` | Liveness: app + DB reachability. |
| `GET /api/health/load` | Synthetic load / pressure signals. |
| `GET /api/health/diagnostics` | Extended diagnostics (restrict exposure in prod). |

## Realtime & region

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/realtime` | Supabase realtime channel health. |
| `GET /api/health/region` | Active region / routing hints. |
| `GET /api/health/region/active` | Region failover state. |

## Telemetry & predictive

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/telemetry` | Telemetry ingest buffer / client event age. |
| `GET /api/health/predictive` | Predictive engine signals (ingest backoff, etc.). |

## UI & rate limits

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/ui` | UI bundle / feature flags surface (if configured). |
| `GET /api/health/rate-limits` | Per-bucket rate limit counters. Suffixes match `src/middleware.ts`. |

### Rate limit buckets (`RATE_LIMITS`)

| Suffix | Scope |
|--------|--------|
| `cards-search` | `GET /api/cards/search` |
| `cards-mut` | Non-GET mutations under `/api/cards` (excludes search) |
| `deck-mut` | Non-GET under `/api/decks` |
| `binder-mut` | Non-GET under `/api/binders` |
| `trades-mut` | Non-GET under `/api/trades` |
| `scan-mut` | `POST /api/scan` |
| `matching-read` | `GET /api/matching/*` |
| `log-ingest` | `POST /api/log` |
| `billing-mut` | Non-GET under `/api/billing` (excludes `/api/billing/webhook` for Stripe) |
| `pub-deck-view` | `POST` public deck view |

## Client telemetry surfaces (`SurfaceMountTelemetry` + route errors)

Server-rendered segments mount `SurfaceMountTelemetry` for suspense/timing correlation:

| `surfaceName` | Where |
|---------------|--------|
| `analytics` | `/analytics` |
| `catalog` | `/catalog`, `/catalog/[setId]`, `/catalog/cards/[cardId]` |
| `profile` | `/profile` |
| `achievements` | `/achievements` (success path) |
| `tier` | `/tier` |
| `notifications-panel` | `/notifications` |
| `activity-log` | `/activity` |

**Error boundaries:** `LoggedRouteError` logs `route.segment.error` with `surfaceName` per segment (see each `error.tsx`). Root uses `surfaceName: "root"`.

**Realtime UI:** `RealtimeStatusBanner` emits `realtime.banner.phase` (`retrying` / `exhausted` as `warn`, `reconnected` as `event`).

**Major action events (examples):** `tier.mock_upgrade.success`, `binder.create.success`, `scan.run.success`, `card.grade.analysis_complete`, `deck.create.success`, `deck.editor.*`, `trade.create.sent` / `draft`, `trade.action.success`, `trade.message.sent`, `matching.*`.

## Dev-only

| Endpoint | Purpose |
|----------|---------|
| `GET /dev/health` | Developer health page data (disable or protect in production). |

## Suggested panels

1. **Availability:** `core` HTTP 200 rate, p95 latency.
2. **Realtime:** `health/realtime` vs client `realtime.banner.phase` warnings.
3. **API abuse:** `rate-limits` spikes on `cards-mut`, `trades-mut`, `scan-mut`, `billing-mut`.
4. **Telemetry lag:** `telemetry` max event age vs SLO.

## Pre-launch checklist (Phase 29)

1. **Rate limits:** Confirm `GET /api/health/rate-limits` shows all buckets above under load; Stripe **webhook** path is not throttled as end-user traffic.
2. **Error boundaries:** Trigger a throw in a dev build per major route group; verify `route.segment.error` in client ingest (`/api/log`) or server logs.
3. **Telemetry:** Spot-check `mcaLog` events for tier, binder create, scan, grading, deck editor, trade flows, matching (see table above).
4. **Maintenance:** Set `MAINTENANCE_MODE=true`; confirm non-health API returns 503 and UI redirects to `/maintenance`.
5. **Degraded realtime:** Simulate mux exhaustion; confirm banner + `realtime.banner.phase` logs and refresh affordance.
6. **Monitoring:** Dashboards wired to health endpoints + log aggregation for `logServerError` (SSR) and `route.segment.error`.
