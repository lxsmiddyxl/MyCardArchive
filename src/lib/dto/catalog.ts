import type { FeedRankingMetaV4 } from "@/lib/feed/engagement-v4";
import type { FeedItemForRank } from "@/lib/feed/hybrid-rank";
import type { AutoMatchResult } from "@/lib/types/auto-match";

export type CatalogCardHit = {
  id: string;
  name: string;
  set: string;
  set_id?: string;
  number: string;
  rarity: string | null;
  image_url: string | null;
  supertype?: string | null;
  subtypes?: string[];
  /** Catalog primary key (Pokémon TCG API id) — shown as external id when present. */
  tcgplayer_id?: string | null;
};

export type CatalogSetHit = {
  id: string;
  name: string;
  series?: string | null;
  set_code?: string | null;
  release_year?: number | null;
  release_date?: string | null;
  total?: number | null;
  printed_total?: number | null;
  symbol_url?: string | null;
  logo_url?: string | null;
};

export type ScanMatchResult = AutoMatchResult;

export type AddCardPrefillPayload = {
  name?: string;
  number?: string;
  rarity?: string;
  set_name?: string | null;
  set_id?: string | null;
  image_url?: string | null;
  catalog_card_id?: string | null;
  supertype?: string | null;
  subtypes?: string[];
  scan_event_id?: string | null;
  auto_match?: ScanMatchResult | null;
  /** Scroll/highlight this catalog card in suggestions (next-in-set flow). */
  highlight_number?: string | null;
};

export type CardHistoryEntryDTO = {
  card_id: string;
  binder_id: string;
  binder_name: string;
  created_at: string;
};

export type CardSummaryDTO = {
  id: string;
  binder_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
  created_at: string;
};

export type BinderSummaryDTO = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

export type CommunityPostDTO = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
};

/**
 * GET /api/feed `items[]` row: ranked `FeedItemForRank` plus hydration (`actor_*`, etc.).
 * Optional fields are merged at runtime in the route handler.
 */
export type FeedItemDTO = FeedItemForRank & {
  viewer_has_saved?: boolean;
  ranking?: FeedRankingMetaV4;
  subject_id?: string | null;
  payload?: Record<string, unknown>;
};

