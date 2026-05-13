# Production Supabase configuration and RLS posture

This runbook describes how MyCardArchive expects Supabase to behave in **production**, and how to audit Row Level Security (RLS) without shipping permissive policies.

## 1. Client and server keys

| Key | Where it lives | Usage |
|-----|------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Public; required for all environments. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Public; all user-scoped access must go through RLS with the authenticated user. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (never `NEXT_PUBLIC_*`) | Bypasses RLS; use only in secured routes (billing webhooks, admin sync, internal jobs). |

**Rules**

- Never import or log the service role key in client bundles or client-accessible logs.
- Routes that use `createServiceRoleClient()` must validate caller identity (session, signed webhook, or internal secret) before performing work.

## 2. RLS expectations

- Every table holding user-owned or privacy-sensitive data must have **RLS enabled** with policies scoped to `auth.uid()` (or equivalent membership checks for shared resources).
- Avoid `USING (true)` / `WITH CHECK (true)` for the `authenticated` role except where a table is intentionally public read-only and contains no per-user secrets.
- Prefer explicit policies per operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) rather than one overly broad policy.

## 3. Auditing in the Supabase dashboard

1. **Authentication → Policies**: confirm RLS is **on** for each production table in the app path (binders, decks, trades, cards, social projections, etc.).
2. **Database → Roles**: confirm `anon` and `authenticated` cannot escalate to `service_role`.
3. **API → Settings**: confirm PostgREST exposes only intended schemas/tables.

## 4. Codebase audit (repeatable)

From the repo root (examples; adjust for your shell):

```bash
rg "CREATE POLICY" supabase/migrations --glob "*.sql" | rg -i "true" || true
rg "service_role" supabase/migrations --glob "*.sql"
rg "createServiceRoleClient" src
```

Cross-check every `createServiceRoleClient()` import against this list:

- Billing: checkout, portal, webhook.
- Catalog / prices: sync paths that require elevated writes.
- Trades: counterparty inventory reads where RLS would otherwise block a legitimate server-side join.
- Notifications / activity waves / achievements: server-only side effects.

## 5. Dev-only policies

- Do not ship migrations that grant `authenticated` broad access “for debugging.”
- Use `development` guards in **application code** (e.g. internal routes behind secrets), not permanent permissive SQL in production.

## 6. Release gate

Before promoting a release:

- [ ] All migrations applied to the production project (no drift).
- [ ] Spot-check RLS on binders, decks, trades, and community tables in the dashboard.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only on the server host / CI secrets, not in the browser build.
