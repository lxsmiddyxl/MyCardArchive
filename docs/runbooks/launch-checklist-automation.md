# Launch checklist automation

The script `scripts/launch-check.mjs` runs the same gates as CI for a local or staging workspace:

```bash
node scripts/launch-check.mjs
```

Skip the production build when iterating quickly:

```bash
node scripts/launch-check.mjs --no-build
```

## npm alias

```bash
npm run launch:check
```

## Order of operations

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run build` (unless `--no-build`)

Add Playwright smoke manually when a server is already running:

```bash
npm run build && npm run start
# other shell
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e:launch
```

## Supabase migrations

Apply pending migrations in the Supabase SQL editor or CLI **before** tagging a release. The launch script does not run remote DB migrations.
