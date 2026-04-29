# Predictive environment variables

| Variable | Purpose |
|----------|---------|
| **`PREDICTIVE_MODE`** | Set to **`0`** to disable predictors (empty predictions, informational endpoint). Any other value (including unset) enables predictors in server code. |
| **`PREDICTIVE_CONFIDENCE_THRESHOLD`** | Optional override for documentation and future tuning (default **0.85**). CI scripts currently use **0.85** for the “high-confidence warn” gate unless changed in `scripts/predictive-check.mjs` / `stability-runner.mjs`. |
| **`PREDICTIVE_ALLOW_CUSTOM_SUPABASE_HOST`** | Set to **`1`** to allow `regionHealthPredictor` when `NEXT_PUBLIC_SUPABASE_URL` uses a non-`*.supabase.co` host (self-hosted or custom domain). Default behavior only trusts `https://*.supabase.co`. |

## Client / staging overlays

- **`NEXT_PUBLIC_STABILITY_MODE=1`**: Shows the predictive overlay (polls **`/api/health/predictive`**).

## Related

- Recovery: `RECOVERY_AUTO_HEAL`, `STABILITY_MODE` — see [predictive-runbook.md](./predictive-runbook.md).
- Region failover: `REGION_FAILOVER_ENABLED`, `PRIMARY_REGION`, `SECONDARY_REGION` — see [../regions/region-env-vars.md](../regions/region-env-vars.md).
