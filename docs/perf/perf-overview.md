# Performance overview (Phase 55)

## Hot path model

Hot paths are named measurement points for **read-heavy** user flows. Each ID maps to a latency budget and is tracked with ring buffers of recent durations (~50 samples per ID on the server; client samples are POSTed when stability mode is enabled).

**IDs**

- `hp:home:aboveTheFold` — first paint / above-the-fold work on home and dashboard shells.
- `hp:collection:listViewport` — binder / collection list viewport.
- `hp:trade:detail` — trade detail view.
- `hp:activity:feed` — activity feed.
- `hp:notifications:list` — notifications list.
- `hp:search:cards` — card search / inventory.

Instrumentation uses `performance.now()` and aggregates **p50**, **p95**, and **max** per ID. Diagnostics expose evaluations against budgets (`/api/health/diagnostics` → `perf.hotPaths`).

## Latency budgets

Budgets are defined in `src/lib/perf/latency-budgets.ts` (ms):

| Flow | Budget (ms) |
|------|----------------|
| home above-the-fold | 1000 |
| collection list viewport | 800 |
| trade detail | 900 |
| activity feed | 900 |
| notifications list | 800 |
| search cards | 1200 |

**Evaluation:** p95 is compared to the budget. Over-budget paths surface in diagnostics and predictive signals; they do not change product behavior by themselves.

## Caching strategy

- **Scope:** GET / read-only API handlers only. Mutations bypass cache; relevant keys are invalidated after successful writes where a read cache exists (for example trade detail after PATCH).
- **Store:** In-process LRU with TTL and stats (hits, misses, evictions).
- **TTL:** Driven by `src/lib/cache/cache-policies.ts` and environment overrides (`CACHE_TTL_*`). Under elevated load, TTLs may scale down slightly to reduce stale reads while favoring throughput (see load health hints).
- **Toggles:** `CACHE_ENABLED` (default on in code paths that consult the store).

See `perf-env-vars.md` for environment variables and `perf-runbook.md` for tuning and incident response.
