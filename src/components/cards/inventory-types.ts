/** Card row shape from `GET /api/cards/list` (global inventory / binder picker). */
export type InventoryCardItem = {
  id: string;
  binder_id: string;
  binder_name: string | null;
  name: string;
  number: string | null;
  rarity: string | null;
  /** Front thumbnail URL (binder grids use the same source). */
  image_front_thumb_url: string | null;
  /** @deprecated Same as thumb when stored in DB; kept for binder slot picker. */
  image_url: string | null;
  set: string | null;
  created_at: string;
};
