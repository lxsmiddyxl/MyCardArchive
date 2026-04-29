# Load environment variables

| Variable | Purpose |
|----------|---------|
| **`LOAD_SHEDDING_ENABLED`** | Set to **`0`** to disable shedding rules (no flag updates / no `loadshedding.trigger` side effects). Default: enabled. |
| **`LOAD_SHEDDING_THRESHOLD`** | Base event-loop lag threshold (ms) for elevating load state. Default internal baseline ~**80** ms; tiers scale from this. |
| **`LOAD_DEGRADATION_MODE_OVERRIDE`** | Optional: force **`degrade:none`**, **`degrade:light`**, **`degrade:medium`**, or **`degrade:severe`** regardless of computed load (staging drills). |

## CI / scripts

| Variable | Used by |
|----------|---------|
| **`LOAD_CHECK_URL`** | `scripts/load-check.mjs` (falls back to **`STABILITY_BASE_URL`**) |
| **`LOAD_CHECK_LAG_FAIL_MS`** | Max acceptable **event loop lag** sample (default **600**) |
| **`LOAD_CHECK_JITTER_FAIL_MS`** | Max acceptable **layout thrash proxy** (default **25**) |

See [load-overview.md](./load-overview.md) and [load-runbook.md](./load-runbook.md).
