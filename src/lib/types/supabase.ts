/**
 * Re-exports Supabase CLI–generated types (`supabase gen types typescript`).
 * Source: `supabase/types/database.types.ts`
 *
 * Regenerate:
 *   npx supabase gen types typescript --project-id <ref> --schema public > supabase/types/database.types.ts
 * Re-apply patches there if needed after schema changes (see migration 011 binder system).
 */
export type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../../supabase/types/database.types";

export { Constants } from "../../../supabase/types/database.types";
