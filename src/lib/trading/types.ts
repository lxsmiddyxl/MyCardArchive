export type TradeStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "countered"
  | "completed";

export type TradeCardLine = {
  id: string;
  cardId: string;
  name: string;
  setName: string | null;
  rarity: string | null;
  imageUrl: string | null;
  binderId: string;
  binderName: string | null;
  quantity: number;
};

export type TradeMessage = {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
};

export type TradeRecord = {
  id: string;
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  counterpartyId: string;
  /** True when the current viewer is the trade creator */
  viewerIsCreator: boolean;
  /** Creator’s outgoing cards (offer) */
  offerSideA: TradeCardLine[];
  /** Cards requested from the counterparty */
  offerSideB: TradeCardLine[];
  partyALabel: string;
  partyBLabel: string;
  /** When present, includes recent chat */
  messages?: TradeMessage[];
};

export type TradeDraft = {
  counterpartyId: string;
  offerSideA: Omit<TradeCardLine, "id">[];
  offerSideB: Omit<TradeCardLine, "id">[];
  /** If true, creates a trade immediately visible to the counterparty */
  sendNow?: boolean;
};

export type TradeSummaryStats = {
  totalCards: number;
  sets: string[];
  rarityCounts: Record<string, number>;
};

export type TradeLineInput = {
  cardId: string;
  quantity: number;
};
