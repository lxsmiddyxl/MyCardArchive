# Load shedding runbook

## Interpreting load states

- **`GET /api/health/load`** — canonical snapshot: `loadState`, `degradationMode`, `snapshot`, `flags`, `ring`, `sheddingEvents`.
- **`GET /api/health/diagnostics`** — includes a **`load`** section when load diagnostics ran (`loadState`, `degradationMode`, `shedding` summary).
- With **`NEXT_PUBLIC_STABILITY_MODE=1`**, the **MCA load** overlay shows load/degrade labels, lag/jitter sparklines, and recent shedding events.

## Auto coordination with predictive

When **`predictiveAutoHealCheck`** sees any predictor with **`severity === critical`**, it sets **load state to `critical`**, runs **shedding rules** for the critical tier, then proceeds with recovery actions (Phase 53).

## Operator actions

1. **elevated / light** — Monitor; confirm no deploy in progress; check Supabase/Vercel status.
2. **high / medium** — Reduce optional background jobs; consider scaling app instances or DB connections upstream.
3. **critical / severe** — Treat as incident: follow region / predictive runbooks; scale infra if lag is host-wide rather than a single hot route.

## When to scale infra

- Sustained **event-loop lag** and **heap** growth across instances after shedding.
- **Region latency** elevated for both primary and secondary while external status pages are green (possible network or client misconfiguration).

## CI

- **`scripts/load-check.mjs`** samples **`/api/health/load`** for ~5s and fails on **`loadState === critical`** or configurable lag/jitter ceilings.
- **`scripts/stability-runner.mjs`** fails if **`loadState === critical`** or **`degradationMode === degrade:severe`**.
