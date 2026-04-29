# Predictive diagnostics runbook

## Interpreting predictions

- Open **`GET /api/health/predictive`** for the canonical list of predictors, **`highestSeverity`**, and **`ok`** (false when severity is `critical`).
- **`GET /api/health/diagnostics`** includes a **`predictive`** section when `predictiveSnapshotCheck` ran (mirrors predictions + highest severity).
- In staging with **`NEXT_PUBLIC_STABILITY_MODE=1`**, the **MCA predictive** overlay shows each predictor’s severity, confidence, and sparkline.

## What triggers auto-heal

When **`RECOVERY_AUTO_HEAL=1`** or **`STABILITY_MODE=1`** (default auto-heal in stability contexts) **and** **`predictiveAutoHealCheck`** runs:

- Any predictor with **`severity === "critical"`** maps to a recovery action:
  - `realtimeLatencyPredictor` → `realtimeRecoveryAction`
  - `telemetryIngestPredictor` → `telemetryRecoveryAction`
  - `virtualizationLoadPredictor` → `virtualizationRecoveryAction`
  - `syntheticInpPredictor` → `uiResponsivenessRecoveryAction`
  - `regionHealthPredictor` → `regionFailoverAction` (only if **`REGION_FAILOVER_ENABLED=1`**)

Recovery runs include **`predictiveTrigger: true`** and **`recoveryAttempt: true`** in action result data when invoked from this path.

## Operator actions

1. **Warn-only**: Trend or backoff — watch dashboards, confirm Supabase/Vercel status, avoid unnecessary deploys.
2. **Critical**: Treat like a pre-outage — follow [failover-runbook](../regions/failover-runbook.md) for region issues; verify realtime channels and telemetry ingest for others.
3. **CI failure**: `scripts/predictive-check.mjs` and `scripts/stability-runner.mjs` fail on **`highestSeverity === "critical"`** or **warn with confidence > 0.85** — inspect `predictive-report.json` / `stability-report.json` artifacts.
