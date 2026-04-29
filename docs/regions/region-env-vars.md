# Region environment variables

| Variable | Purpose |
|----------|---------|
| **`PRIMARY_REGION`** | Logical id for the primary region (default `primary` if unset). Used with URL maps below. |
| **`SECONDARY_REGION`** | Logical id for the secondary region. Empty means no secondary; single-region mode. |
| **`ACTIVE_REGION`** | Intended active logical region at deploy time; **in-memory** `setActiveRegion` can override when `REGION_FAILOVER_ENABLED=1`. |
| **`REGION_FAILOVER_ENABLED`** | Set to **`1`** to allow server-side failover/failback actions and `setActiveRegion` updates. Any other value disables automatic logical switching. |

## Related public URLs (not renamed here)

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Primary Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_URL_SECONDARY` | Secondary project URL when `SECONDARY_REGION` is set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY_SECONDARY` | Anon keys per region. |
| `NEXT_PUBLIC_SITE_URL` | Primary site origin for telemetry health probes. |
| `NEXT_PUBLIC_SITE_URL_SECONDARY` | Secondary site origin (falls back to primary if unset). |

See also [multi-region-overview.md](./multi-region-overview.md) and [failover-runbook.md](./failover-runbook.md).
