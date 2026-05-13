# CI — Playwright smoke + migration checks

This complements `.github/workflows/ci.yml` and `docs/runbooks/e2e-playwright.md`.

## What CI runs today

On `push` / `pull_request` to `main` or `master`, the **build** job:

1. Installs dependencies (`npm ci`) and **Playwright Chromium** (`npx playwright install chromium --with-deps`).
2. Verifies migration **103** is present and contains the expected draft-delete policy name (`trades_delete_own_draft`).
3. Runs `lint` and `npm run build` with placeholder `NEXT_PUBLIC_*` env (no live Supabase required for compile).
4. Starts `npm run start`, runs health / load / predictive / stability / perf scripts, then:
   - `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test` on:
     - `tests/e2e/smoke.spec.ts`
     - `tests/e2e/api-protected-routes.spec.ts`
     - `tests/e2e/trades-dual-account.spec.ts`

The Playwright subset does **not** require `E2E_TEST_*` credentials (skipped tests inside files are OK). Authenticated-heavy suites stay in `npm run test:e2e:core` for local/optional CI secrets.

## Local parity

```bash
npm run build
npm run start -- -p 3000
# other shell:
npm run test:e2e:launch
```

## Migrations (103 and beyond)

- Apply policies to your Supabase project per `docs/runbooks/migration-103-trades-draft-delete-rls.md`.
- CI only checks that the SQL file exists and contains the policy marker; it does **not** run `supabase db push` (no linked project in default CI).

## Optional: full E2E in CI

Add repository secrets `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and optionally counterparty vars, then extend the workflow with a dedicated job that runs `npm run test:e2e:core` against a real Supabase-backed deployment.
