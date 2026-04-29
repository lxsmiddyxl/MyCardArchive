import { isUuidString } from "@/lib/server/is-uuid";

export type StructuredOfferItem = {
  catalog_card_id: string;
  qty: number;
};

/**
 * Normalizes client JSON for `items_offered` / `items_requested` (Phase 71).
 */
export function normalizeStructuredItems(raw: unknown): StructuredOfferItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StructuredOfferItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { catalog_card_id?: unknown }).catalog_card_id;
    const qtyRaw = (row as { qty?: unknown }).qty;
    if (typeof id !== "string" || !isUuidString(id)) continue;
    const qty =
      typeof qtyRaw === "number" && Number.isFinite(qtyRaw) && qtyRaw > 0
        ? Math.min(99, Math.floor(qtyRaw))
        : 1;
    out.push({ catalog_card_id: id, qty });
  }
  return out;
}

export function structuredPayloadNonEmpty(itemsOffered: StructuredOfferItem[], itemsRequested: StructuredOfferItem[]) {
  return itemsOffered.length > 0 || itemsRequested.length > 0;
}

export function buildStructuredOfferSummary(
  itemsOffered: StructuredOfferItem[],
  itemsRequested: StructuredOfferItem[],
  notes?: string | null
): string {
  const parts: string[] = [];
  if (itemsOffered.length) {
    parts.push(`Offer: ${itemsOffered.map((i) => `${i.qty}× ${i.catalog_card_id.slice(0, 8)}…`).join(", ")}`);
  }
  if (itemsRequested.length) {
    parts.push(`Want: ${itemsRequested.map((i) => `${i.qty}× ${i.catalog_card_id.slice(0, 8)}…`).join(", ")}`);
  }
  if (notes?.trim()) {
    parts.push(notes.trim());
  }
  return parts.join(" · ") || "Structured offer";
}
