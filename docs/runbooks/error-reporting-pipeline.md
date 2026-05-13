# Error reporting pipeline (Phase 54)

MyCardArchive uses a **custom** pipeline rather than bundling Sentry by default:

1. **API envelopes** — `successJson` / `errorJson` include `context_id` and the response header `x-mca-context-id` (same value) for correlation between browser devtools, server logs, and support tickets.
2. **Server logs** — `logServerError` prefixes messages with `ctx=<uuid>` when a correlation id is passed (e.g. from `defineRoute` catch paths).
3. **Client telemetry** — `mcaLog` (see `src/lib/logging/mca-log-client.ts`) batches envelopes to `/api/log` in production and mirrors to `window.__MCA_TELEMETRY__` in development.

## Optional: Sentry

To add Sentry later:

- Install `@sentry/nextjs` and follow the wizard; forward `x-mca-context-id` as a Sentry tag (`mca_context_id`) in the SDK `beforeSend` hook.
- Keep service-role and cookie values out of Sentry breadcrumbs.

## Operations

When investigating a 500 from the API:

1. Read `context_id` from the JSON body or the `x-mca-context-id` response header.
2. Grep server logs for `ctx=<that-uuid>`.
