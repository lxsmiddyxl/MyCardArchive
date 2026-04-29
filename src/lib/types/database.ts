/**
 * Row shapes for the MyCardArchive `public` schema.
 * CLI-aligned types: `supabase/types/database.types.ts` and `src/lib/supabase/types.ts`.
 */

export type ProfileRow = {
  id: string;
  created_at: string;
};

/** public.sets — optional catalog */
export type SetRow = {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
};

/** public.binders */
export type BinderRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

/** public.cards — binder-scoped */
export type CardRow = {
  id: string;
  binder_id: string;
  user_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Normalized quote from a pricing provider (before DB persist). */
export interface PriceData {
  provider: string;
  market_price: number | null;
  currency: string;
  raw: Record<string, unknown>;
}

/** public.card_prices */
export type CardPriceRow = {
  id: string;
  card_id: string;
  user_id: string;
  provider: string;
  market_price: string | number | null;
  currency: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** public.scan_events */
export type ScanEventRow = {
  id: string;
  user_id: string;
  card_id: string | null;
  raw_text: string | null;
  created_at: string;
};

/** Catalog tiers table (seeded); optional reference UI */
export type TierRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  binder_limit: number | null;
  card_limit: number | null;
  scan_limit: number | null;
  created_at: string;
  sort_order: number;
};

/**
 * public.user_tiers — exactly one row per user (PK user_id).
 * Migration 016: legacy tier_id / is_active replaced by tier_slug + integer limits.
 */
export type UserTierRow = {
  user_id: string;
  tier_slug: string;
  binder_limit: number;
  card_limit: number;
  scan_limit: number;
  created_at: string;
  updated_at: string;
};
