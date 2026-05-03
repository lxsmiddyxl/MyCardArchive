/** `/api/decks/[deckId]/import` response (matches import modal preview). */

export type DeckImportAddedRowDTO = { name: string; card_id: string; quantity: number };
export type DeckImportUnmatchedRowDTO = { line: string; quantity: number; reason: string };

export type DeckImportResultDTO = {
  added?: DeckImportAddedRowDTO[];
  unmatched?: DeckImportUnmatchedRowDTO[];
};

/** Narrow ack for `/api/decks/[deckId]/cards/add` | `.../remove`. */
export type DeckCardSlotMutationAckDTO = { ok?: boolean; error?: string };

/** `POST /api/decks/add-card` success body. */
export type DeckAddCardResponseDTO = {
  deck_card?: {
    id?: string;
    deck_id?: string;
    card_id?: string;
    section?: string;
    quantity?: number;
  };
  error?: string;
};
