# Deploy rollback and deploy-verify

## Triggers

- **`scripts/deploy-verify.mjs`** runs after a deploy (or in CI) to confirm the live URL passes:
  - `npm run health:check` — all JSON `/api/health/*` routes (core, realtime, telemetry, rate-limits, diagnostics, ui)
  - `npm run stability:run` — stability report (includes synthetic realtime unless skipped)

If either step fails, the script writes **`rollback.json`** in the working directory and exits with code **1**.

## Auto-rollback (CI / automation)

This repository does not revert cloud provider revisions automatically. Treat a failed `deploy-verify` run as a **signal** to:

- Stop promoting the broken revision
- Redeploy the last known-good artifact, or
- Run your platform’s native rollback (e.g. Vercel “Instant Rollback”, Kubernetes rollout undo)

The GitHub Actions workflow **`.github/workflows/rollback.yml`** is a **manual** entry point to document and coordinate rollback steps; it does not mutate production by itself.

## Environment

Set one of:

- `DEPLOY_VERIFY_URL` — preferred single base URL
- or both `HEALTH_CHECK_URL` and `STABILITY_BASE_URL` (usually the same origin)

Example:

```bash
DEPLOY_VERIFY_URL=https://myapp.example.com node scripts/deploy-verify.mjs
```

## Manual override

- Skip deploy-verify only when you intentionally accept risk (hotfix, known failing checks).
- Document overrides in your change management process.
- Runtime **self-healing** (Phase 50) runs inside the app when `STABILITY_MODE=1` / `RECOVERY_AUTO_HEAL` — it does not replace rolling back a bad build.

## Logs

Server-side recovery and rollback markers use **`mcaLog`** (`recovery.*` events). CI cannot call the app logger directly; use **`rollback.json`** and workflow logs as the audit trail for deploy-verify failures.
