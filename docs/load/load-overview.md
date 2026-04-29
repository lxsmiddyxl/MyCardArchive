# Load shedding & degradation (Phase 54)

MyCardArchive tracks **load state** on the server using Node **event-loop delay**, **heap memory**, **virtualization layout thrash** (rAF jitter proxy), **region probe latencies**, **telemetry ingest backoff**, and **predictive** highest severity. A **ring buffer** (~24 samples) feeds diagnostics and the **load health** endpoint.

## Load state model

| State       | Typical signals |
|------------|------------------|
| **normal** | Low lag, stable region latency, quiet ingest backoff |
| **elevated** | Rising lag, streak, or predictive warn |
| **high**     | Strong backoff streak, high region latency, or sustained pressure |
| **critical** | Extreme lag, unhealthy region, or predictive critical |

Thresholds scale with **`LOAD_SHEDDING_THRESHOLD`** (base lag in ms; default ~80 ms for “elevated” tiers).

## Degradation modes

Mapped from load state unless **`LOAD_DEGRADATION_MODE_OVERRIDE`** is set:

| Load      | Mode |
|-----------|------|
| normal    | `degrade:none` |
| elevated  | `degrade:light` |
| high      | `degrade:medium` |
| critical  | `degrade:severe` |

Scaling helpers (overscan, telemetry interval, INP probe cadence, region probe interval) live in `src/lib/load/degradation-modes.ts`. **`GET /api/health/load`** exposes **`flags`** so clients can adopt reduced overscan / telemetry rates without changing core product code paths.

## Shedding rules

Registered in `src/lib/load/load-shedding.ts`. Each rule is **idempotent**, updates in-memory **`LoadSheddingFlags`**, and logs **`loadshedding.trigger`**. Rules are skipped when **`LOAD_SHEDDING_ENABLED=0`**.

See [load-runbook.md](./load-runbook.md) for operations.
