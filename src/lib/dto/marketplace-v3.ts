/**
 * Marketplace v3 — qualitative, read-only DTOs (no monetary amounts or payment flows).
 */

export type MarketplaceOfferV3DTO = {
  id: string;
  thread_id: string;
  status: string;
  catalog_card_id: string | null;
  created_at: string;
  updated_at: string;
  /** Non-empty line derived from structured items / body (trimmed, capped). */
  summary_line: string;
};

export type MarketplaceListingV3DTO = {
  catalog_card_id: string;
  intent: "for_trade" | "looking_for";
  collector_count: number;
  card_count: number;
};

/** Relative, unitless interest — not a price. */
export type MarketplacePriceSignalV3DTO = {
  catalog_card_id: string;
  /** 0–100 coarse bucket for UI / ranking hints. */
  relative_interest_0_100: number;
  tone: "rising_interest" | "steady" | "cooling";
  /** Short qualitative copy for UI. */
  caption: string;
};

export type MarketplaceDiscoveryCardsV3DTO = {
  want_by_catalog: MarketplaceListingV3DTO[];
  offer_by_catalog: MarketplaceListingV3DTO[];
  match_hints: { catalog_card_id: string; match_kind: string }[];
};

export type MarketplaceDiscoveryTradeV3DTO = {
  id: string;
  status: string;
  created_at: string;
  /** True when the viewer is not a party (only qualitative “activity in network”). */
  anonymized: boolean;
};

export type MarketplaceReadonlyViewV3DTO = {
  generated_at: string;
  /** Counts only — no currency. */
  my_open_offer_threads: number;
  top_listings: MarketplaceListingV3DTO[];
  top_price_signals: MarketplacePriceSignalV3DTO[];
};
