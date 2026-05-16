import type { TradeRoomV2DTO, TradeRoomV2MessageDTO } from "@/lib/dto/trade-room-v2";
import { mapRowToMarketplaceV3OfferDTO, type MarketOfferRowLike } from "@/lib/marketplace/v3-offer-lifecycle";
import { sanitizePlainTextUserInput } from "@/lib/server/sanitize-user-text";

export function sanitizeTradeRoomMessage(raw: string): string {
  return sanitizePlainTextUserInput(raw, 4000);
}

export function buildTradeRoomV2Payload(input: {
  threadId: string;
  offers: MarketOfferRowLike[];
  messages: { id: string; actor_id: string; body: string; created_at: string }[];
  updatedAt: string;
}): TradeRoomV2DTO {
  const participants = new Set<string>();
  for (const o of input.offers) {
    participants.add(o.from_user_id);
    participants.add(o.to_user_id);
  }
  const messages: TradeRoomV2MessageDTO[] = input.messages.map((m) => ({
    id: m.id,
    actorId: m.actor_id,
    body: m.body,
    createdAt: m.created_at,
  }));
  return {
    roomId: input.threadId,
    participants: [...participants],
    messages,
    offers: input.offers.map(mapRowToMarketplaceV3OfferDTO),
    updatedAt: input.updatedAt,
  };
}

export function isTradeRoomParticipant(userId: string, offers: MarketOfferRowLike[]): boolean {
  return offers.some((o) => o.from_user_id === userId || o.to_user_id === userId);
}
