/**
 * Binder 3.0 client/API DTOs. Keep in sync with `/api/binders/*` route payloads.
 */

/** Page metadata (optional counts for UI). */
export type BinderPageDTO = {
  page_number: number;
  slot_count?: number;
};

/** Card row embedded in a slot from list/update APIs. */
export type BinderSlotCardDTO = {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string | null;
  number: string | null;
  binder_id: string;
  image_front_thumb_url?: string | null;
};

/** One binder slot row from the database + joined card. */
export type BinderSlotDTO = {
  id: string;
  binder_id: string;
  page_number: number;
  slot_index: number;
  card_id: string | null;
  created_at: string;
  card?: BinderSlotCardDTO | null;
};

/** `GET /api/binders/[binderId]/slots/list` — pages keyed by String(page_number). */
export type BinderSlotsListPayloadDTO = {
  pages: Record<string, BinderSlotDTO[]>;
  maxPages: number;
  pageNumbers: number[];
};

/** Lightweight page index payload for pickers and rails (no slot bodies). */
export type BinderPageListDTO = {
  pageNumbers: number[];
  maxPages: number;
};

/** Slots-only slice (e.g. optimistic merge helpers). */
export type BinderSlotListDTO = {
  pages: Record<string, BinderSlotDTO[]>;
};

/**
 * Common fields returned by binder mutation routes (`pages/*`, `slots/move`).
 * Extend per-route in handlers; clients narrow as needed.
 */
export type BinderMutationResponseDTO = {
  ok: boolean;
  message?: string;
  duration_ms?: number;
  page_number?: number;
  slot?: BinderSlotDTO;
};
