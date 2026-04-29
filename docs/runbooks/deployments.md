# Runbook: Deployments

MyCardArchive deploys as a **Next.js** application (typical target: **Vercel** or Node host). This runbook describes operational steps; the authoritative **checklist** is `docs/deployments/checklist.md`.

## Preconditions

- **Migrations:** `supabase/migrations/` applied to the target Postgres (Supabase) **before** or **in lockstep** with app deploys that depend on schema.
- **Environment variables:** mirror `.env.local.example` for required keys; production uses real Supabase URL/keys, Stripe secrets, `NEXT_PUBLIC_SITE_URL`, optional `INTERNAL_TELEMETRY_SECRET`, `MAINTENANCE_MODE`.

## Symptoms of a bad deploy

- **500** on most routes: mis-set `NEXT_PUBLIC_*` or missing `SUPABASE_SERVICE_ROLE_KEY` on server routes.
- **Auth loops:** `NEXT_PUBLIC_SITE_URL` mismatch with actual domain.
- **Stripe webhook failures:** `STRIPE_WEBHOOK_SECRET` or URL misconfigured in Stripe Dashboard.

## Diagnosis steps

1. Open hosting **deployment logs** (build + runtime).
2. Verify **environment** scope (Preview vs Production) and variable values (not logged in public issues).
3. Run **post-deploy checks** from `docs/deployments/checklist.md`.

## Commands (local parity)

```bash
npm ci
npm run lint
npm run build
npm run start   # optional smoke against production build
```

CI mirrors lint + build: `.github/workflows/ci.yml`.

## Recovery steps

1. **Rollback:** use host “Promote previous deployment” or redeploy known-good Git SHA.
2. **Hotfix:** push minimal fix; avoid schema + app mismatch—coordinate migrations.
3. **Maintenance:** enable `MAINTENANCE_MODE=true` during investigation (see `maintenance-mode.md`); **note:** Stripe webhooks receive **503** while maintenance is on—coordinate billing window.

## Escalation

- **P1** data corruption suspected: freeze writes (maintenance mode) and involve DBA/Supabase support.
- **Secrets leak:** rotate Supabase JWT secret, Stripe keys, `INTERNAL_TELEMETRY_SECRET` per vendor procedures.

## Related docs

- `docs/deployments/checklist.md` — pre/post deploy verification
- `docs/runbooks/incidents.md` — severity and comms
- `docs/runbooks/maintenance-mode.md` — full-site maintenance behavior
