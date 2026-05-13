# Runbooks (Phase 47)

Operational guides for MyCardArchive. Start here during incidents or deployments.

| Document | Topic |
|----------|--------|
| [observability.md](./observability.md) | Logs, telemetry, `/api/log`, internal telemetry |
| [realtime.md](./realtime.md) | Supabase Realtime, subscriptions, stress script |
| [rate-limits.md](./rate-limits.md) | Middleware 429 buckets |
| [deployments.md](./deployments.md) | Deploy process and recovery |
| [incidents.md](./incidents.md) | Severity, first response, rollback |
| [maintenance-mode.md](./maintenance-mode.md) | `MAINTENANCE_MODE` behavior |
| [e2e-playwright.md](./e2e-playwright.md) | Playwright env vars, local vs CI server |
| [ci-playwright-and-migrations.md](./ci-playwright-and-migrations.md) | CI smoke tests + migration 103 file checks |
| [migration-103-trades-draft-delete-rls.md](./migration-103-trades-draft-delete-rls.md) | Trade draft DELETE RLS + CASCADE rollback |

**Deployment checklist:** [../deployments/checklist.md](../deployments/checklist.md)

**Rollback & deploy-verify:** [../deployments/rollback.md](../deployments/rollback.md)
