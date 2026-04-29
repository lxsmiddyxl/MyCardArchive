# Operations

Practical runbook for people on call for MyCardArchive.

## Handling outages

1. **Confirm scope**: app shell vs Supabase vs Vercel/hosting vs DNS. Check status pages and internal alerts.
2. **User comms**: switch to maintenance copy if you have a feature flag or static page; otherwise post a short status note per your channel policy.
3. **Mitigate**: scale or failover per `docs/regions/failover-runbook.md` if multi-region is enabled; otherwise focus on restoring the primary database and edge.
4. **Recover**: after green health checks, run a smoke test (login, binder load, deck load).
5. **Post-incident**: log timeline, root cause, and follow-ups in your tracker; link `docs/runbooks/incidents.md` templates if used.

## Rotating secrets

- **Supabase**: rotate anon/service keys in the Supabase dashboard; update `NEXT_PUBLIC_*` and server secrets in the hosting provider; redeploy so clients pick up public env changes.
- **Stripe / billing**: rotate restricted keys in Stripe dashboard; update deployment secrets; verify webhook endpoints still verify signatures.
- **Session/cookie secrets**: follow your host’s rotation flow; prefer zero-downtime dual-key acceptance if available.

Always validate in staging before production. Document rotation date and owner.

## Running integrity scans

- Use the internal integrity API (see `docs` references to the integrity scan route) from a trusted environment with service credentials **only** where already wired for admin tasks.
- Compare output against expectations (orphan rows, broken FKs). File issues for data fixes; avoid manual production SQL without review.

## Interpreting monitoring dashboards

- **Error rate**: spikes tied to deploys vs sustained new errors — correlate with releases and Supabase logs.
- **Latency p95/p99**: separate API routes from static assets; investigate slow query logs (`supabase.query.slow`) and add indexes or fix N+1 patterns.
- **Realtime**: rising disconnects may indicate client version rollout or network issues; check `docs/runbooks/realtime.md`.
- **Business metrics**: binders/decks created, scans consumed — compare to tier limits and billing.

For deeper performance work, see `docs/perf/perf-runbook.md` and `docs/runbooks/observability.md`.
