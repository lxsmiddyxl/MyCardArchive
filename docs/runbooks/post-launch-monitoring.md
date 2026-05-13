# Post-launch monitoring and hotfix pipeline

## Monitoring

- **GitHub Actions**: CI on `master` is the primary regression signal; protect branch with required checks.
- **Health endpoints**: `/api/health/core`, `/api/health/ui`, `/api/health/rate-limits` — wire to your external uptime provider (cron GET).
- **Supabase**: enable email alerts for database CPU, replication lag, and auth anomaly spikes.

## Hotfix workflow

1. Branch from the release tag: `git checkout -b hotfix/short-desc v1.0.0`.
2. Commit the minimal fix; open PR to `master` with `[hotfix]` in the title.
3. After merge, tag a patch (`v1.0.1`) and deploy.

## Rollback

- **Vercel / host**: redeploy the previous successful deployment artifact.
- **Database**: use PITR to rewind only when coordinated with application version — see `docs/runbooks/backup-restore-dr.md`.

## Client issues

- Correlate with `x-mca-context-id` from failing API responses (`docs/runbooks/error-reporting-pipeline.md`).
