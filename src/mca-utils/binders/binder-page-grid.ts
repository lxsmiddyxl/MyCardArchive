import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import type { BinderSlotDTO } from "@/lib/dto/binder";
import type { BinderSlotRef } from "./dragAndDrop";

export type BinderPageSlotView = {
  slotId: string | null;
  slotIndex: number;
  cardId: string | null;
  card: {
    id: string;
    name: string;
    image_url: string | null;
    image_front_thumb_url?: string | null;
  } | null;
};

export function buildSlotsForPage(
  pages: Record<string, BinderSlotDTO[]>,
  page: number
): BinderPageSlotView[] {
  const list = pages[String(page)] ?? [];
  return Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slotIndex) => {
    const row = list.find((s) => s.slot_index === slotIndex) ?? null;
    if (row?.card) {
      return {
        slotId: row.id,
        slotIndex,
        cardId: row.card_id,
        card: {
          id: row.card.id,
          name: row.card.name,
          image_url: row.card.image_url,
          image_front_thumb_url: row.card.image_front_thumb_url ?? null,
        },
      };
    }
    if (row) {
      return { slotId: row.id, slotIndex, cardId: row.card_id, card: null };
    }
    return { slotId: null, slotIndex, cardId: null, card: null };
  });
}

export function findSlotRow(
  pages: Record<string, BinderSlotDTO[]>,
  ref: BinderSlotRef
): BinderSlotDTO | null {
  const list = pages[String(ref.page)] ?? [];
  return list.find((s) => s.slot_index === ref.slot) ?? null;
}

export function slotHref(binderId: string, slot: BinderPageSlotView, page: number): string {
  const base = `/binders/${encodeURIComponent(binderId)}/slot`;
  if (slot.slotId) return `${base}/${encodeURIComponent(slot.slotId)}`;
  return `${base}/p${page}-s${slot.slotIndex}`;
}
