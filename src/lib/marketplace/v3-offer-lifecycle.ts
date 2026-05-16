import type { MarketplaceV3OfferDTO } from "@/lib/dto/marketplace-v3-offers";
import {
  buildStructuredOfferSummary,
  normalizeStructuredItems,
  type StructuredOfferItem,
} from "@/lib/market/structured-offer";

export type MarketOfferRowLike = {
  id: string;
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string;
  items_offered?: unknown;
  items_requested?: unknown;
  offer_notes?: string | null;
};

export function mapRowToMarketplaceV3OfferDTO(row: MarketOfferRowLike): MarketplaceV3OfferDTO {
  const itemsOffered = normalizeStructuredItems(row.items_offered);
  const itemsRequested = normalizeStructuredItems(row.items_requested);
  const summary =
    row.body?.trim() ||
    buildStructuredOfferSummary(itemsOffered, itemsRequested, row.offer_notes ?? null);
  return {
    offerId: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    threadId: row.thread_id,
    itemsOffered,
    itemsRequested,
    status: row.status,
    summaryLine: summary.slice(0, 280),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function offerHistoryRole(
  viewerId: string,
  offer: Pick<MarketplaceV3OfferDTO, "fromUserId" | "toUserId">
): "sent" | "received" | null {
  if (offer.fromUserId === viewerId) return "sent";
  if (offer.toUserId === viewerId) return "received";
  return null;
}

export function validateRespondPayload(body: {
  offerId?: string;
  action?: string;
  items_offered?: unknown;
  items_requested?: unknown;
  counter_body?: string;
}): { ok: true; offerId: string; action: "accept" | "decline" | "counter"; itemsOffered: StructuredOfferItem[]; itemsRequested: StructuredOfferItem[]; counterBody: string } | { ok: false; error: string } {
  const offerId = body.offerId?.trim() ?? "";
  if (!offerId) return { ok: false, error: "offerId required" };
  const action = body.action?.trim();
  if (action !== "accept" && action !== "decline" && action !== "counter") {
    return { ok: false, error: "action must be accept, decline, or counter" };
  }
  const itemsOffered = normalizeStructuredItems(body.items_offered);
  const itemsRequested = normalizeStructuredItems(body.items_requested);
  const counterBody = typeof body.counter_body === "string" ? body.counter_body.trim() : "";
  if (action === "counter" && itemsOffered.length === 0 && itemsRequested.length === 0 && !counterBody) {
    return { ok: false, error: "counter requires items or counter_body" };
  }
  return { ok: true, offerId, action, itemsOffered, itemsRequested, counterBody };
}
