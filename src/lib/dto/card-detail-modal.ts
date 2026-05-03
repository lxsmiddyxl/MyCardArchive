/**
 * Client-facing shapes for `/api/cards/[id]/detail` and card modal bootstrap payloads.
 */

export type CardDetailCatalogDTO = {
  id: string;
  name: string;
  supertype: string | null;
  subtypes: string[];
  legal_standard: boolean;
  legal_expanded: boolean;
  legal_unlimited: boolean;
  legal_commander: boolean;
};

export type CardDetailDTO = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  image_url: string | null;
  image_front_thumb_url?: string | null;
  image_front_full_url?: string | null;
  image_back_full_url?: string | null;
  image_back_thumb_url?: string | null;
  binder_id: string;
  binder_name: string | null;
  catalog_card_id: string | null;
  for_trade: boolean;
  looking_for: boolean;
  catalog: CardDetailCatalogDTO | null;
  deck_locations: { deck_id: string; deck_name: string; zone: string; quantity: number }[];
  price: {
    market_price: number | null;
    currency: string;
    provider: string;
    updated_at: string;
  } | null;
};

export type CardDetailModalBinderDTO = { id: string; name: string };
export type CardDetailModalDeckDTO = { id: string; name: string };

/** Returned by main modal bootstrap (`detail` + picker lists). */
export type CardModalBootstrapDTO = {
  detail: CardDetailDTO | null;
  binders: CardDetailModalBinderDTO[];
  decks: CardDetailModalDeckDTO[];
};

export type CardDetailApiPayloadDTO = {
  card?: CardDetailDTO | null;
};

/** PATCH `/api/cards/[id]` — response body is narrow; extra fields ignored client-side. */
export type CardPatchResponseDTO = {
  card?: CardDetailDTO;
};
