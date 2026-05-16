import type { StructuredOfferItem } from "@/lib/market/structured-offer";

/** Phase 81 — structured qualitative offer (no currency). */
export type MarketplaceV3OfferDTO = {
  offerId: string;
  fromUserId: string;
  toUserId: string;
  threadId: string;
  itemsOffered: StructuredOfferItem[];
  itemsRequested: StructuredOfferItem[];
  status: string;
  summaryLine: string;
  createdAt: string;
  updatedAt?: string;
};

export type MarketplaceV3OfferHistoryEntryDTO = {
  offer: MarketplaceV3OfferDTO;
  role: "sent" | "received";
};

export type MarketplaceV3OfferRespondAction = "accept" | "decline" | "counter";
