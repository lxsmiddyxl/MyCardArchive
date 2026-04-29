# Runbook: Incident response

## Severity levels

| Level | Meaning | Example | Response target |
|-------|---------|---------|-----------------|
| **SEV1** | Site unusable or data integrity at risk | Auth broken, mass 500, wrong user data | Immediate page + assign IC |
| **SEV2** | Major feature degraded | Realtime down, trades not updating | < 1h acknowledgment |
| **SEV3** | Minor / isolated | Single API 500 spike, UI glitch | Next business day tracking |

*(Adjust names to your org’s on-call policy.)*

## First responder steps

1. **Acknowledge** the incident channel / ticket.
2. **Classify** SEV level; if SEV1, consider **`MAINTENANCE_MODE=true`** after quick confirmation (see `maintenance-mode.md`).
3. **Gather:**
   - Time range, region, % affected.
   - Example request id / trace from host logs if available.
4. **Triage by subsystem:**
   - **HTTP/API:** route logs, `defineRoute` 500s, Supabase errors.
   - **Realtime:** `realtime.md`.
   - **429 / abuse:** `rate-limits.md`.
   - **Telemetry blind:** `observability.md`.

## Log sources

| Source | Access |
|--------|--------|
| **Hosting** (Vercel, etc.) | Function / edge logs, invocations |
| **Supabase** | Postgres logs, API logs, Realtime metrics |
| **Stripe** | Dashboard → Webhooks / Events |
| **Internal telemetry snapshot** | `GET /api/internal/telemetry` with secret (`observability.md`) |
| **Browser** | `window.__MCA_TELEMETRY__` (dev only, Phase 46 client buffer) |

## Realtime channel debugging

1. Confirm user session valid (401 breaks subscription setup).
2. Follow `docs/runbooks/realtime.md` for publication and client subscriptions.
3. Capture **one** affected `tradeId` / `userId` and timestamps for engineering.

## Rollback procedure

1. **Application:** redeploy previous **Git** revision via host UI.
2. **Database:** **do not** roll back migrations casually—prefer forward fix. If migration failed mid-deploy, follow Supabase backup / PITR procedures (project settings).
3. **Stripe:** replay failed webhooks from Stripe Dashboard after fix (if idempotent handlers allow).

## Communication

- Post status: **Investigating** → **Identified** → **Monitoring** → **Resolved**.
- For SEV1, include user-facing message if maintenance page is up.

## Post-incident

- Short **blameless** retro: root cause, detection gap, action items (tests, alerts, docs).

## Production readiness (incidents)

- [ ] On-call rotation documented externally.
- [ ] Secrets for `INTERNAL_TELEMETRY_SECRET` and Supabase accessible to responders.
- [ ] Runbook links bookmarked (`docs/runbooks/`).
