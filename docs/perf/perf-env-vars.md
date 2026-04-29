# Performance and cache environment variables

## `CACHE_ENABLED`

- **Purpose:** Master switch for the in-memory read cache on instrumented GET handlers.
- **Typical values:** unset / `1` / `true` to enable; `0` / `false` to disable (falls back to direct reads).

## `CACHE_TTL_SEARCH`

- **Purpose:** TTL override (milliseconds) for card search read cache.
- **Default:** Defined in `src/lib/cache/cache-policies.ts` (search policy range 15–30s, subject to load scaling).

## `CACHE_TTL_COLLECTION`

- **Purpose:** TTL override for collection / binder list viewport reads.
- **Default:** Policy range 10–20s.

## `CACHE_TTL_ACTIVITY`

- **Purpose:** TTL override for activity feed reads.
- **Default:** Policy range 10–20s.

## `CACHE_TTL_NOTIFICATIONS`

- **Purpose:** TTL override for notifications list reads.
- **Default:** Policy range 5–15s.

## Related (stability / perf snapshot)

- **`PERF_SNAPSHOT_BASE_URL`** — Base URL for `scripts/perf-snapshot.mjs` (e.g. `http://127.0.0.1:3000`).
- **`PERF_ALLOW_ZERO_SAMPLES`** — Set to `1` in CI when not all hot paths receive samples (e.g. no browser in the job); see `perf-runbook.md`.
- **`NEXT_PUBLIC_STABILITY_MODE`** — Enables client devtools overlays including MCA perf; client hot path samples are sent when this and server stability mode align with your deployment.
