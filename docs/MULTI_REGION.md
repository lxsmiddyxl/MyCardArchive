# Multi-region and failover

MyCardArchive supports **logical regions** (labels such as `primary` / `eu-west-1`) with optional **secondary Supabase projects** and **automated failover** when health checks fail.

## Environment variables

| Variable | Role |
|----------|------|
| `PRIMARY_REGION` | Logical id for the default region (default: `primary`). |
| `SECONDARY_REGION` | Logical id for the standby region; empty disables secondary. |
| `NEXT_PUBLIC_SUPABASE_URL` | Primary Supabase REST/realtime URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Primary anon key. |
| `NEXT_PUBLIC_SUPABASE_URL_SECONDARY` | Secondary project URL when `SECONDARY_REGION` is set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY_SECONDARY` | Secondary anon key (optional; may fall back to primary key during migration). |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SITE_URL_SECONDARY` | Site origins for per-region health probes. |
| `REGION_FAILOVER_ENABLED` | Set to `1` to allow `performFailover` / `performFailback` in `failover-engine`. |
| `ACTIVE_REGION` | Optional override for which region is “active” at runtime (see `region-state`). |
| `NEXT_PUBLIC_MCA_REGION` | Public label surfaced in clients for telemetry and support (e.g. `us-east-1`). |

## Runtime behavior

- **Predictive engine** `regionHealthPredictor` pings REST, Realtime, and telemetry for each configured region and surfaces `primaryRegion` / `secondaryRegion` in prediction `data`.
- **Failover** (`src/lib/failover/failover-engine.ts`) runs when `REGION_FAILOVER_ENABLED=1`, secondary is configured, and `shouldFailover` / `shouldFailback` pass. Telemetry includes `region.failover.start`, `region.failover.success` (cut to secondary), and `region.failover.rollback` (failback to primary), in addition to legacy `failover.*` events.

## Deployment guidance

1. Provision secondary Supabase in the target geography; replicate data per your DR strategy (this repo does not automate replication).
2. Set secondary URL/key env vars on staging; run smoke tests (auth, binders, trades, realtime).
3. Enable `REGION_FAILOVER_ENABLED` only after runbooks and dashboards are ready (`docs/runbooks/failover-runbook.md`, `docs/regions/multi-region-overview.md`).
4. Keep `NEXT_PUBLIC_MCA_REGION` aligned with the edge region users hit for easier support correlation.

## Client routing

Browsers still use `NEXT_PUBLIC_SUPABASE_URL` from the build. Switching regions for **end users** requires deploying a build that points at the secondary project or using a global load balancer in front of the app — the env-based failover here targets **operations** and **degraded primary** scenarios coordinated with `runFailoverActions`.
