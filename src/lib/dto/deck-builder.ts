import type { DeckAddCardResponseDTO, DeckCardSlotMutationAckDTO } from "@/lib/dto/deck-import";
import type { DeckRow } from "@/lib/decks/editor-types";

/**
 * Deck surface types for builder UI and `/api/decks/*` JSON payloads.
 */

/** Deck row from DB — matches `decks` table / editor payload `deck`. */
export type DeckDTO = DeckRow;

/** Joined `cards` row on a deck_cards line (builder list view). */
export type DeckZoneCardEmbedDTO = {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string | null;
  number: string | null;
};

/** One line in a zone from `GET .../cards/list`. */
export type DeckZoneCardRowDTO = {
  deck_id: string;
  card_id: string;
  quantity: number;
  section: string;
  cards: DeckZoneCardEmbedDTO | null;
};

/** Slot shape used for optimistic/local merges (subset of deck_cards). */
export type DeckSlotDTO = {
  deck_id: string;
  card_id: string;
  section: string;
  quantity: number;
};

export type DeckCardsByZoneDTO = {
  main: DeckZoneCardRowDTO[];
  sideboard: DeckZoneCardRowDTO[];
  commander: DeckZoneCardRowDTO[];
};

/** `GET /api/decks/[deckId]/cards/list` body (MCA envelope adds `success`). */
export type DeckCardsListPayloadDTO = {
  deck_id: string;
  cards: DeckCardsByZoneDTO;
};

/** `POST /api/decks/[deckId]/cards/add` success payload (partial). */
export type DeckCardAddMutationDTO = {
  deck_card?: Record<string, unknown>;
  deck_stats_synced?: boolean;
  deck_stats_error?: string;
};

/** Generic mutation ACK for deck POST routes that may return `{ error }` on failure. */
export type DeckMutationResponseDTO = {
  ok?: boolean;
  error?: string;
  deck_card?: Record<string, unknown>;
  deck_stats_synced?: boolean;
};

/** Plain-text export from `GET /api/decks/[deckId]/export`. */
export type DeckExportPayloadDTO = {
  format: string;
  text: string;
};

/** Re-export narrow mutation ACKs for deck builder mutations. */
export type DeckMutationAckDTO = DeckCardSlotMutationAckDTO;
export type DeckAddCardDTO = DeckAddCardResponseDTO;
