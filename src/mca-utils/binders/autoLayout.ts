import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import { normalizeRarityBucket } from "@/lib/catalog/binder-rarity-hints";
import { RARITY_SORT_ORDER } from "@/mca-utils/binders/binder-insights-types";
import type { BinderSlotRef } from "./dragAndDrop";

export type LayoutMode = "number" | "rarity" | "set" | "custom";

export type LayoutCardInput = {
  id: string;
  number: string | null;
  rarity: string | null;
  set_id: string | null;
  set_name: string | null;
};

export type LayoutAssignment = BinderSlotRef & { card_id: string };

function cardNumberSortKey(number: string | null): [number, string] {
  const stem = (number?.split("/")[0]?.trim() ?? "").replace(/^#/, "");
  const num = parseInt(stem, 10);
  return [Number.isFinite(num) ? num : 999_999, stem.toLowerCase()];
}

export function sortCardsForLayout(
  cards: LayoutCardInput[],
  mode: LayoutMode
): LayoutCardInput[] {
  if (mode === "custom") return [...cards];
  const copy = [...cards];
  if (mode === "number") {
    copy.sort((a, b) => {
      const [an, as] = cardNumberSortKey(a.number);
      const [bn, bs] = cardNumberSortKey(b.number);
      if (an !== bn) return an - bn;
      if (as !== bs) return as.localeCompare(bs);
      return a.id.localeCompare(b.id);
    });
    return copy;
  }
  if (mode === "rarity") {
    copy.sort((a, b) => {
      const ai = RARITY_SORT_ORDER.indexOf(normalizeRarityBucket(a.rarity));
      const bi = RARITY_SORT_ORDER.indexOf(normalizeRarityBucket(b.rarity));
      if (ai !== bi) return ai - bi;
      const [an] = cardNumberSortKey(a.number);
      const [bn] = cardNumberSortKey(b.number);
      if (an !== bn) return an - bn;
      return a.id.localeCompare(b.id);
    });
    return copy;
  }
  if (mode === "set") {
    copy.sort((a, b) => {
      const sa = (a.set_name ?? a.set_id ?? "").toLowerCase();
      const sb = (b.set_name ?? b.set_id ?? "").toLowerCase();
      if (sa !== sb) return sa.localeCompare(sb);
      const [an, as] = cardNumberSortKey(a.number);
      const [bn, bs] = cardNumberSortKey(b.number);
      if (an !== bn) return an - bn;
      if (as !== bs) return as.localeCompare(bs);
      return a.id.localeCompare(b.id);
    });
    return copy;
  }
  return copy;
}

/** Assign sorted cards to consecutive pages (9 per page). */
export function computeAutoLayoutAssignments(
  cards: LayoutCardInput[],
  mode: LayoutMode
): LayoutAssignment[] {
  if (mode === "custom") return [];
  const sorted = sortCardsForLayout(cards, mode);
  const out: LayoutAssignment[] = [];
  sorted.forEach((card, index) => {
    const page = Math.floor(index / BINDER_SLOTS_PER_PAGE);
    const slot = index % BINDER_SLOTS_PER_PAGE;
    out.push({ page, slot, card_id: card.id });
  });
  return out;
}

export function pageCountForAssignments(assignments: LayoutAssignment[]): number {
  if (assignments.length === 0) return 1;
  return Math.max(...assignments.map((a) => a.page)) + 1;
}
