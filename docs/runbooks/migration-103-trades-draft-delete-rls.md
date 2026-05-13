# Migration 103 — trades draft DELETE + CASCADE RLS

File: `supabase/migrations/103_trades_draft_delete_cascade_rls.sql`

## What it does

Application code deletes a **draft** row from `public.trades` when inserting `trade_items` fails after the trade row was created (`src/lib/trading/db.ts`). Postgres **CASCADE** then removes related `trade_items` and `trade_messages`.

Without matching **DELETE** policies on those tables, Supabase RLS blocks the rollback delete. Failed rollbacks leave **orphan draft trades**.

This migration adds:

| Table | Policy | Role |
|-------|--------|------|
| `public.trades` | `trades_delete_own_draft` | Authenticated user may delete rows where `auth.uid() = created_by` and `status = 'draft'`. |
| `public.trade_items` | `trade_items_delete_draft_participant` | Deletes allowed when the parent trade is `draft` and the user is the creator. |
| `public.trade_messages` | `trade_messages_delete_draft_creator` | Same pattern for messages tied to a draft trade. |

It also issues `grant delete` on those tables to `authenticated` where required.

## Apply — local dev

1. Ensure your Supabase CLI is logged in and the project is linked (`supabase link --project-ref …` if needed).
2. Push pending migrations to your **development** database:

   ```bash
   supabase db push
   ```

   Alternatively, run the SQL file in the Supabase SQL editor (Dashboard → SQL → paste contents of `103_trades_draft_delete_cascade_rls.sql` → run).

3. Regenerate types if your workflow uses generated types after schema/policy changes:

   ```bash
   supabase gen types typescript --linked > supabase/types/database.types.ts
   ```

   (Adjust output path to match your repo convention.)

## Apply — staging / production

Use the same migration pipeline you use for other numbered migrations (no special casing).

1. **Review** the diff in `103_trades_draft_delete_cascade_rls.sql` in the release PR.
2. **Staging:** apply via `supabase db push` against the staging project, or your CI/CD migration step that runs `supabase migration up` / linked push.
3. **Production:** apply during a maintenance window if your policy requires it; this change is **additive** (new policies + grants) and is safe to run while the app is live.

Avoid editing historical migration files after they have been applied to an environment; add a new migration for follow-up changes.

## Safety checks

After apply:

1. **RLS still on** (should already be true):

   ```sql
   select tablename, rowsecurity
   from pg_tables
   where schemaname = 'public'
     and tablename in ('trades', 'trade_items', 'trade_messages');
   ```

2. **Policies exist:**

   ```sql
   select policyname, cmd, roles
   from pg_policies
   where schemaname = 'public'
     and tablename = 'trades'
     and policyname = 'trades_delete_own_draft';
   ```

   Repeat for `trade_items` / `trade_messages` with the names from the migration file.

3. **Optional — orphan drafts:** investigate old drafts that never cleaned up (run only if you suspect historical failures):

   ```sql
   select id, created_by, status, created_at
   from public.trades
   where status = 'draft'
     and created_at < now() - interval '7 days'
   order by created_at asc
   limit 50;
   ```

## Related code

- Rollback path: `createTradeWithItems` delete on failure — `src/lib/trading/db.ts`
- Warning log when delete fails: search `rollback delete failed` in the same file
