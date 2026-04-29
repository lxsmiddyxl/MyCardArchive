# Performance runbook

## Interpreting diagnostics

1. Open `GET /api/health/diagnostics` and inspect `perf.hotPaths` and `perf.cache`.
2. **`perf.hotPaths`** — one row per known hot path ID: `budget`, `p95`, `ok`, `samples`, `overBudgetByMs`.
   - **`ok: false`** — p95 exceeds the latency budget for that path (warning-level for UX; investigate if sustained).
   - **`samples: 0`** — no measurements yet (cold process, or client paths without stability mode / traffic).
3. **`perf.cache`** — `hits`, `misses`, `hitRatio`, `evictions`, `size`. Use hit ratio to confirm caching is effective on read-heavy routes.

Staging overlays (`NEXT_PUBLIC_STABILITY_MODE=1`) include **MCA perf**, which mirrors hot path vs budget and cache stats.

## Predictive and load signals

- **Predictive:** `perfLatencyPredictor` uses hot path p95 vs budgets. When p95 approaches or exceeds a budget, severity escalates (warn → critical by margin). This informs recovery suggestions; it does not alter trades, pricing, or data rules.
- **Load:** When load state is high, cache TTL may be shortened slightly and read-through caching may be preferred for expensive endpoints (see `GET /api/health/load` snapshot hints).

## When budgets are exceeded

1. **Confirm signal:** Re-check diagnostics; look for single spikes vs sustained p95 over budget.
2. **Isolate layer:** Compare server timings (API handlers instrumented with `markHotPathStart` / `markHotPathEnd`) vs client-tracked paths (double-rAF on pages).
3. **Read path cost:** Verify Supabase queries, N+1 patterns, and payload size on the affected route.
4. **Cache:** Ensure `CACHE_ENABLED` is on for that route class; tune TTL upward only if data freshness allows (see below).

## CI: `perf-snapshot.mjs`

The script reads `perf.hotPaths` and fails if:

- Any path with samples has **p95 > 2 × budget** (hard ceiling), or
- Any **critical** hot path has **no samples**, unless `PERF_ALLOW_ZERO_SAMPLES=1` (used when the pipeline does not exercise all browser-only paths).

To enforce the “no samples” check in environments that run browser or synthetic traffic, omit `PERF_ALLOW_ZERO_SAMPLES`.

## Tuning cache TTLs safely

- Prefer **small increments** (a few seconds) and re-measure p95 and hit ratio.
- **Shorter TTL** when data must be fresher (notifications, activity). **Longer TTL** for expensive search queries when stale results are acceptable for a short window.
- Never cache POST/PUT/PATCH responses; invalidate keys after successful mutations that affect cached reads.
