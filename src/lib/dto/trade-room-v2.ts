import type { MarketplaceV3OfferDTO } from "@/lib/dto/marketplace-v3-offers";

export type TradeRoomV2MessageDTO = {
  id: string;
  actorId: string;
  body: string;
  createdAt: string;
};

export type TradeRoomV2DTO = {
  roomId: string;
  participants: string[];
  messages: TradeRoomV2MessageDTO[];
  offers: MarketplaceV3OfferDTO[];
  updatedAt: string;
};
