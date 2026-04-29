# Runbook: Supabase Realtime

Realtime powers live updates for trades, notifications, activity, matching index refresh, and channel diagnostics.

## Symptoms

- UI stuck “loading” after navigation while others update.
- Trades/messages appear only after manual refresh.
- `RealtimeStatusBanner` (if visible) shows degraded state.
- Matching dashboard never flashes “Updated” after index change.

## Architecture (reference)

- **Client factory & subscriptions:** `src/lib/realtime/channels.ts` (large file—search for `subscribeTo` helpers).
- **Feature wiring:** e.g. `src/lib/trading/trade-realtime.ts`, `src/lib/notifications/realtime.ts`, `src/lib/notifications/activity-realtime.ts`, matching debounce in `src/components/matching/matching-dashboard-client.tsx`.
- **Client telemetry:** Phase 46 `mcaLog` → `POST /api/log` for connection lifecycle in `channels.ts` (see `docs/runbooks/observability.md`).
- **DB publication (apply 037–039 as a set):**
  - `037_index_tables_delete_policies.sql` — authenticated **delete** on `user_wantlist_index` / `user_havelist_index` (quantity→0 maintenance; required so matching index rows can be removed cleanly alongside realtime consumers).
  - `038_enable_realtime_publication.sql` — adds `notifications`, `activity_log`, `trades`, `trade_messages`, `user_havelist_index`, `user_wantlist_index` to `supabase_realtime`.
  - `039_trade_items_realtime_publication.sql` — adds `trade_items` for `postgres_changes` on line items (trade detail refreshes offer sides without a full trade refetch).

## Diagnosis steps

1. **Browser**
   - DevTools → Network → WS (if applicable) or filter `realtime` / Supabase host.
   - Console: auth session present? 401 on REST usually breaks subscription setup.

2. **Supabase Dashboard**
   - Project → **Database** → replication / Realtime settings (confirm tables published per migration intent).
   - **Logs** for Realtime or API errors during incident window.

3. **Application**
   - Verify user id passed to subscribe helpers matches RLS expectations (own rows only).

4. **Stress script (non-prod or controlled)**
   - `npm run stress:realtime` → `scripts/realtime-stress.mjs` (see script header for usage).

## Commands / URLs

```bash
# Local stress (read script for env requirements)
npm run stress:realtime
```

No public “health” WebSocket URL is standardized in-repo; use Supabase dashboard for connection metrics.

## Expected logs

- Client: structured `mcaLog` events for presence lifecycle (`channels.ts`) → `/api/log` when `NODE_ENV === "production"`.
- Server: standard Next logs on API errors; not every realtime message is logged server-side.

## Recovery steps

1. **Transient disconnect:** client often recovers on navigation; force reload.
2. **Stuck subscription:** identify leak—ensure `useEffect` cleanups call `unsubscribe` return values.
3. **Post-deploy publication missing:** re-run migration review; confirm new tables added to publication in a new migration if required.
4. **Matching index stale:** check debounce timers and silent refetch paths; see matching client and `src/lib/matching/index-maintenance.ts` for server-side index updates.

## Escalation

- **P1** widespread realtime down: Supabase status page + project logs; consider read-only mode messaging via `MAINTENANCE_MODE` (see `maintenance-mode.md`).
- **Data incorrect but connected:** likely application merge logic—escalate to engineering with trade id / user id and timestamp.

## Production readiness (realtime)

- [ ] Migrations **037–039** applied; `trade_items` and tables from **038** appear under Realtime publication in Supabase.
- [ ] After schema change, migrations include publication updates when new tables need `postgres_changes`.
- [ ] Staging smoke: trade detail — send a message (live merge); change a line item (offer sides update without full reload).
