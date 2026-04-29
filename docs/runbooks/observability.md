# Runbook: Observability (logs & telemetry)



MyCardArchive uses a **single canonical client path** for structured browser telemetry plus server-only loggers.



## Systems in scope



| Path | Purpose | Key files |

|------|---------|-----------|

| **Structured client logs (Phase 46)** | JSON `McaLogEnvelope` → `POST /api/log` in production; dev ring buffer | `src/lib/logging/mca-log-client.ts`, `src/app/api/log/route.ts`, `src/lib/server/mca-telemetry-buffer.ts` |

| **Aggregated snapshot** | Minute buckets from `POST /api/log` + server `telemetry/logger` | `GET /api/internal/telemetry` (`src/app/api/internal/telemetry/route.ts`), `src/lib/telemetry/aggregation.ts` |

| **Tab correlation id** | Stable per-tab id for realtime mux / presence | `src/lib/telemetry/client-telemetry.ts` (`getTelemetryConnectionId`) |

| **Server `mcaLog`** | Server-only structured push | `src/lib/logging/mca-log-server.ts` |

| **Pino + aggregation (server)** | Server `telemetry/logger.ts` → Pino + `recordTelemetryEvent` | `src/lib/telemetry/logger.ts` |

| **Route wrapper errors** | `defineRoute` / `logServerError` | `src/lib/server/api-route.ts`, `src/lib/server/observability.ts` |

| **Health JSON (Phase 48+)** | Operator probes; no secrets in responses | `GET /api/health/core`, `…/realtime`, `…/telemetry`, `…/rate-limits`, `…/diagnostics`, `…/ui` under `src/app/api/health/` |

| **Stability & recovery (Phase 49–50)** | CI + staging scripts; auto-heal when enabled | `scripts/health-check.mjs`, `scripts/stability-runner.mjs`, `src/lib/recovery/`, `STABILITY_MODE`, `RECOVERY_AUTO_HEAL` |
| **Feature monitoring map** | Grading / realtime / matching / billing log touchpoints | `docs/runbooks/monitoring-surface.md` |



## Symptoms



- Missing client events in production: check **auth** on `/api/log` (401 if session expired).

- **`TELEMETRY_INGEST_DISABLED=1`**: health and diagnostics treat client telemetry as intentionally degraded (see `src/app/api/health/telemetry/route.ts`, `src/lib/diagnostics/builtins.ts`). Legacy `POST /api/internal/telemetry/ingest` has been removed; use `/api/log` only.

- DevTools ring buffer: in development, `window.__MCA_TELEMETRY__` (see `mca-log-client.ts`).



## Diagnosis steps



1. **Confirm environment**

   - `NEXT_PUBLIC_*` and server secrets loaded on the deployment (Vercel/host env UI).

   - `INTERNAL_TELEMETRY_SECRET` matches the header used for `GET /api/internal/telemetry`.



2. **Test `/api/log` (authenticated)**

   - From a logged-in browser session, POST a minimal valid envelope (see `src/lib/logging/types.ts` and validation in `src/app/api/log/route.ts`).

   - Expect **204** on success.



3. **Test internal snapshot**

   - Development: `GET /api/internal/telemetry` with session cookie → **200** JSON.

   - Production: same URL with header `x-internal-telemetry-secret: <INTERNAL_TELEMETRY_SECRET>`.



4. **Server logs**

   - Hosting platform logs (Vercel function logs, etc.) for `logServerError` output from failed route handlers.



## Health endpoints (smoke)



- **`npm run health:check`** — fetches all `/api/health/*` JSON routes (expects `ok: true` on each).

- **`npm run stability:run`** — health routes plus synthetic realtime (optional skip via env) and aggregated report; see `scripts/stability-runner.mjs`.

- **`npm run deploy:verify`** — runs `health:check` then `stability:run` against `DEPLOY_VERIFY_URL` / `HEALTH_CHECK_URL`; writes `rollback.json` on failure (`docs/deployments/rollback.md`).



## Commands / URLs



```bash

# Local (session cookie required in browser; or use curl with copied Cookie)

curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/internal/telemetry



# Production snapshot (replace HOST and SECRET)

curl -sS -H "x-internal-telemetry-secret: $INTERNAL_TELEMETRY_SECRET" https://HOST/api/internal/telemetry | jq .

```



Dev pages: `/dev/telemetry`, `/dev/logs` (if present in app router).



## Expected logs



- **Phase 46** envelopes: `level`, `name`, `data`, `ts`, `componentName`, `surfaceName`, optional `traceId`.

- **Aggregation** rows: `StructuredLogEvent` derived from accepted `/api/log` envelopes and from server `telemetry/logger` (see `src/lib/telemetry/schema.ts`).

- **Middleware / API 429**: rate-limit responses (see `rate-limits.md`).



## Recovery steps



- **Telemetry disabled**: `TELEMETRY_INGEST_DISABLED=1` — restore when incident cleared; client `/api/log` traffic remains the only browser pipeline.

- **Log storm**: reduce client logging frequency; verify `mcaLog` not in hot loops without throttling.

- **Secret rotation**: update `INTERNAL_TELEMETRY_SECRET` in host env and in operator runbooks/password store.



## Escalation



- **P1** data loss suspected: verify Supabase RLS and that `/api/log` only appends `_userId` to `data` (see route handler)—no service role in client paths.

- **Vendor APM**: if later wired, document sink in this file under “Systems in scope”.



## Observability dashboards (documentation only)



| Dashboard (conceptual) | Data source | Owner |

|------------------------|-------------|-------|

| **MCA internal snapshot** | `GET /api/internal/telemetry` | Engineering |

| **Host logs** | Vercel / Node stdout | Engineering |

| **Supabase** | Postgres logs, Realtime health | Platform |



Hosted Grafana/Datadog is **not** defined in-repo; add rows here when adopted.



## Production readiness (observability)



- [ ] `POST /api/log` returns 401 without session; 204 with valid envelope.

- [ ] Canonical path for incidents: **Phase 46 `mcaLog` → `/api/log`** (plus server `mcaLog` / `telemetry/logger` where applicable).

- [ ] `INTERNAL_TELEMETRY_SECRET` stored in secrets manager, not in git.

