# Launch checklist

Use this before promoting a build to production or opening a beta cohort.

## QA — core flows

- **Auth**: sign in, sign out, session refresh after idle, protected routes redirect to login with `next` preserved.
- **Binders**: create binder, open detail, paginate grid, drag/drop slot, add card from empty slot, card detail modal, offline strip + last-known-good grid if you disconnect mid-session.
- **Decks**: list decks, open editor, add/move/remove cards, legality panel updates, export/import modals.
- **Matching**: discovery feed and match lists load; silent refetch after realtime signal (debounced); safe-mode panel after repeated failures.
- **Trades**: create/view trade, send message, status transitions.
- **Scan**: upload image, run scan (online), verify offline blocks scan and “add to binder”; last scan restores after reload (session LKG).

## Telemetry verification

- Client events reach aggregation: sign in to staging, perform one action per surface (binder move, deck edit, trade message, scan success).
- Confirm `a11y.environment` (or related) fires once per session in browser network or log sink.
- Confirm server logs include `supabase.query.slow` only when queries exceed the configured threshold (see `query-timing`).
- Spot-check `offline.lkg.restore` and `offline.action.blocked` during deliberate offline tests.

## Monitoring verification

- Dashboards referenced in `docs/monitoring-dashboard.md` show healthy baseline (error rate, latency, auth).
- Realtime: connection count and channel errors within expected bounds after a short session.
- Background jobs / cron (if any) last-run timestamps are current.

## Rate limits verification

- Exercise authenticated routes that apply limits (scan, trades, API abuse surfaces) against staging; confirm `429` behavior and user-visible copy.
- Review `docs/runbooks/rate-limits.md` for environment-specific headers and bypass rules (none in production).

## Realtime degradation tests

- Toggle network off/on: app should show offline notice on scoped layouts, avoid throwing uncaught errors, and recover after reconnect.
- Simulate Supabase realtime disconnect (dev tools or firewall): UI degrades gracefully; manual refresh still works.

## Offline tests

- Load binder detail, deck editor, matching, and scan while online; then go offline and confirm cached/LKG behavior and blocked mutations where expected.
- Reconnect and confirm a normal refresh restores live data without stale UI stuck indefinitely.
