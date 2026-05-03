/** Types aligned with `/api/market/offers` and `/api/market/trade-rooms/[threadId]`. */

export type MarketOfferRowDTO = {
  id: string;
  thread_id: string;
  parent_offer_id: string | null;
  from_user_id: string;
  to_user_id: string;
  catalog_card_id: string | null;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string;
  items_offered?: unknown;
  items_requested?: unknown;
  offer_notes?: string | null;
  expires_at?: string | null;
};

/** Alias for naming consistency across consolidation passes. */
export type MarketOfferDTO = MarketOfferRowDTO;

export type MarketOfferTimelineEventDTO = {
  id: string;
  thread_id: string;
  offer_id: string;
  event_type: string;
  actor_id: string;
  created_at: string;
};

export type MarketOfferRevisionSnapshotDTO = {
  body?: unknown;
  [key: string]: unknown;
};

export type MarketOfferRevisionRowDTO = {
  id: string;
  thread_id: string;
  seq: number;
  offer_id: string;
  snapshot: MarketOfferRevisionSnapshotDTO;
  actor_id: string;
  created_at: string;
};

/** UI alias for revision timeline rows. */
export type MarketOfferRevisionDTO = MarketOfferRevisionRowDTO;

export type MarketOfferThreadPackDTO = {
  thread_id: string;
  offers: MarketOfferRowDTO[];
  last_at: string;
};

/** UI naming alias for offer threads. */
export type TradeThreadDTO = MarketOfferThreadPackDTO;

export type MarketOffersListPayloadDTO = {
  threads?: MarketOfferThreadPackDTO[];
};

export type MarketTradeRoomPayloadDTO = {
  offers?: MarketOfferRowDTO[];
  events?: MarketOfferTimelineEventDTO[];
  revisions?: MarketOfferRevisionRowDTO[];
};

export type MarketOfferMutationResponseDTO = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};
