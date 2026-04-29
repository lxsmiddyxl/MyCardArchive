# Failover runbook (operators)

Use this when regional outages, Supabase incidents, or app degradation suggest switching traffic or validating DR readiness.

## Symptoms

- Elevated 5xx or timeouts from the primary app or Supabase.
- **`GET /api/health/region`** shows `primary.ok: false` while `secondary.ok: true` (secondary must be configured).
- Users stuck after a failed deploy; **realtime** or **telemetry** checks failing in diagnostics.
- **`STABILITY_MODE`** / **`NEXT_PUBLIC_STABILITY_MODE=1`**: devtools overlays show failing health rows.

## Diagnosis

1. Call **`GET /api/health/region`** and note `primary`, `secondary`, `activeRegion`, `failoverEnabled`.
2. Call **`GET /api/health/diagnostics`** and inspect `regionHealthCheck` / `regionFailbackCheck` results.
3. Confirm env: **`REGION_FAILOVER_ENABLED`**, **`PRIMARY_REGION`**, **`SECONDARY_REGION`**, secondary Supabase URL and site URL if used.
4. Check Supabase status and Vercel/deployment status for the affected region.

## Manual failover (when automation is off or unsafe)

1. Set **`REGION_FAILOVER_ENABLED=1`** only if controlled failover is intended.
2. Ensure secondary URLs and keys are correct (`NEXT_PUBLIC_SUPABASE_URL_SECONDARY`, anon key, optional `NEXT_PUBLIC_SITE_URL_SECONDARY`).
3. Redeploy or route traffic to the secondary **deployment** (Vercel project/region, DNS, or edge config) per your infra plan.
4. Set **`ACTIVE_REGION`** to the secondary label to match runtime expectations after deploy.
5. Verify **`GET /api/health/region/active`** and app smoke tests (auth, binders, decks).

## Manual failback

1. Confirm primary **`GET /api/health/region`** shows primary healthy.
2. Route traffic back to the primary deployment; align **`ACTIVE_REGION`** with **`PRIMARY_REGION`**.
3. Remove or disable **`REGION_FAILOVER_ENABLED`** if you want to prevent automatic logical switches until the next drill.

## Escalation

- If health probes are green but users still fail: check **RLS**, **auth**, and **client-side Supabase URL** (still single-region in many builds until multi-region client routing is fully wired).
- For data consistency: **Supabase replication / branching** is outside this app repo—coordinate with your database team.
