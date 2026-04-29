/**
 * Supabase `public` schema types for the binder system and shared tables.
 * Source of truth: `supabase/types/database.types.ts` (keep in sync with migrations).
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

import type { Database } from "../../../supabase/types/database.types";

export type BinderRow = Database["public"]["Tables"]["binders"]["Row"];
export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type ScanEventRow = Database["public"]["Tables"]["scan_events"]["Row"];
export type UserTierRow = Database["public"]["Tables"]["user_tiers"]["Row"];
