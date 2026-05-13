# Playwright E2E — setup and CI

## Requirements

- Node 20+ (aligned with CI).
- Playwright browser binaries (once per machine / CI image):

  ```bash
  npx playwright install chromium
  ```

- `.env.local` with valid `NEXT_PUBLIC_*` Supabase vars so the app can run against your dev project.
- Optional authenticated tests: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`.
- Dual-account trade tests (`tests/e2e/trades-dual-account.spec.ts`): add  
  `E2E_COUNTERPARTY_EMAIL`, `E2E_COUNTERPARTY_PASSWORD`.  
  Both accounts need **at least one collection card** so `/api/trades/create` can attach offer/request lines.

## Local — Playwright starts the dev server (default)

From the repo root:

```bash
npx playwright test tests/e2e/core-rls-surfaces.spec.ts
```

Playwright runs `npm run dev:pw` (Next on `127.0.0.1:3000`) and waits until `GET /api/health/ui` returns **200**. If you already have a dev server on that origin, it is reused.

If port **3000** is taken, either stop the other process or point Playwright at another URL:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3001"
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
npm run dev -- -H 127.0.0.1 -p 3001
# other terminal:
npx playwright test tests/e2e/core-rls-surfaces.spec.ts
```

## Local — you start the server manually

```powershell
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
npm run dev:pw
# other terminal:
npx playwright test tests/e2e/core-rls-surfaces.spec.ts
```

## CI

By default `playwright.config.ts` does **not** start `next dev` when `CI=true` (avoids long cold compiles and surprises).

Recommended pattern after a production build:

```bash
npm run build
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
  npm run start -- -p 3000 &
# wait until /api/health/ui returns 200, then:
npx playwright test
```

To let Playwright spawn `npm run dev:pw` in CI (slower):

```bash
CI=1 PLAYWRIGHT_START_WEBSERVER=1 npx playwright test
```

## NPM shortcuts

| Script | Purpose |
|--------|---------|
| `npm run test:e2e` | Full Playwright suite |
| `npm run test:e2e:launch` | Smoke + protected API + trades visibility (CI subset) |
| `npm run test:e2e:protected` | `api-protected-routes.spec.ts` only |
| `npm run test:e2e:core` | `core-rls-surfaces.spec.ts` |
| `npm run test:e2e:trades-dual` | `trades-dual-account.spec.ts` |

See `docs/runbooks/ci-playwright-and-migrations.md` for how this maps to GitHub Actions.
