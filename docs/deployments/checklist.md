# Deployment checklist (Phase 47)

Use this for production releases and major staging promotions.

## Pre-deploy checks

- [ ] **Git:** target branch merged; CI green (`.github/workflows/ci.yml`: typecheck + lint + build + Playwright smoke).
- [ ] **Migrations:** Supabase migrations applied to target DB; types regenerated if your process requires (`supabase/types` / `src/lib/types`).
- [ ] **Env:** `NEXT_PUBLIC_SITE_URL` matches user-facing origin; Stripe keys and webhook URL match environment.
- [ ] **Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `INTERNAL_TELEMETRY_SECRET` (if used) present in host—not committed.
- [ ] **Maintenance:** `MAINTENANCE_MODE` **unset/false** unless intentional cutover.

## Deploy

- [ ] Deploy via host (e.g. Vercel “Deploy” or push to production branch).
- [ ] Watch build logs to completion.

## Post-deploy verification

- [ ] **Smoke:** open `/`, `/login`, `/decks` (authenticated)—no unexpected 500.
- [ ] **API:** `GET /api/cards/search?q=pikachu` returns **200** shape (or auth error where expected).
- [ ] **Health JSON:** against the deployed origin, `HEALTH_CHECK_URL=https://<host> npm run health:check` (or pass base URL as argv) — exit **0**.
- [ ] **Stability (optional but recommended):** `STABILITY_BASE_URL=https://<host> npm run stability:run` — exit **0**; set `STABILITY_SKIP_REALTIME_SYNTHETIC=1` if using a placeholder Supabase URL in CI-like checks.
- [ ] **Deploy gate:** `DEPLOY_VERIFY_URL=https://<host> npm run deploy:verify` — runs health + stability; on failure writes `rollback.json` (see `docs/deployments/rollback.md`).
- [ ] **Billing:** Stripe test event or dashboard “Send test webhook” in non-prod; production **only** with approval.

## Realtime smoke test

- [ ] Log in; open **trade detail** or **notifications**; confirm list updates without full reload (see `docs/runbooks/realtime.md`).
- [ ] Optional: run `npm run stress:realtime` against **staging** only.

## Telemetry test

- [ ] **Development:** open `/dev/telemetry` and confirm snapshot loads when logged in (aggregates include events accepted via `POST /api/log`).
- [ ] **Production:** `GET /api/internal/telemetry` with `x-internal-telemetry-secret` **or** verify host logs show expected traffic; `POST /api/log` returns **401** without session, **204** with valid envelope when testing with a session.

## Storybook

- [ ] `npm run build-storybook` succeeds locally before major UI releases.

## Production readiness criteria (release gate)

| Criterion | Met? |
|-----------|------|
| CI typecheck + lint + build + health/stability + Playwright passing | ☐ |
| DB migrations applied | ☐ |
| Critical env vars set on production | ☐ |
| Post-deploy smoke complete | ☐ |
| Realtime smoke on one critical path | ☐ |
| Telemetry path verified (see observability runbook) | ☐ |
| Storybook build succeeds (major UI releases) | ☐ |
| Rollback SHA noted | ☐ |

## Rollback

- Redeploy previous **known-good** deployment; if schema changed, confirm backward compatibility or have forward migration ready.
