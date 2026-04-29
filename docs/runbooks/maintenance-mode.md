# Runbook: Maintenance mode (Phase 47)

Full-site maintenance blocks normal HTML navigation and API traffic while showing a static message.

## Behavior

- **Trigger:** environment variable `MAINTENANCE_MODE` set to **`true`**, **`1`**, or **`yes`** (case-insensitive). Implemented in `src/middleware.ts`.
- **HTML:** All paths except `/maintenance`, `/maintenance/*`, and `/_next/*` receive **307** redirect to `/maintenance`.
- **API:** Requests to `/api/*` receive **503** JSON:
  ```json
  { "error": "Service temporarily unavailable", "code": "MAINTENANCE" }
  ```
  Header: `Retry-After: 120`, `Cache-Control: no-store`.

## Symptoms

- Users see **“We’ll be right back”** at `/maintenance`.
- Mobile/API clients get **503** with `MAINTENANCE` code.
- **Stripe webhooks** hit `/api/billing/webhook` → **503** while maintenance is on. **Plan:** disable maintenance during webhook replay windows, or temporarily pause webhooks in Stripe Dashboard (coordination required).

## Diagnosis

- Confirm `MAINTENANCE_MODE` in deployment environment (not only `.env.local`).
- Verify redirect is not cached by an upstream CDN for HTML (purge if needed).

## Commands / URLs

```bash
# After enabling MAINTENANCE_MODE on staging:
curl -sS -I https://HOST/ | head -n 5    # expect 307 to /maintenance
curl -sS https://HOST/api/cards/search?q=test
# expect 503 JSON maintenance response
```

## Recovery

1. Set `MAINTENANCE_MODE` to empty or **`false`** in the host environment.
2. Redeploy or wait for env propagation (platform-dependent).
3. Verify `/` loads without redirect and `GET /api/cards/search` returns **200** (or 401/429 as appropriate, not 503).

## Escalation

- If maintenance **cannot** be lifted due to ongoing DB incident, keep page up and update status comms.

## Related

- Page UI: `src/app/maintenance/page.tsx`
- Env template: `.env.local.example` (`MAINTENANCE_MODE` comment)
