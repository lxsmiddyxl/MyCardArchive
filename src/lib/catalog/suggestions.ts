import type { CatalogCardHit } from "@/lib/dto/catalog";

export type SuggestionGroup = {
  id: string;
  title: string;
  hits: CatalogCardHit[];
};

export function buildSuggestionGroups(input: {
  binderRecent: CatalogCardHit[];
  globalRecent: CatalogCardHit[];
  nearby: CatalogCardHit[];
  bySet: CatalogCardHit[];
  selectedId?: string | null;
}): SuggestionGroup[] {
  const groups: SuggestionGroup[] = [];
  const seen = new Set<string>();

  const addGroup = (id: string, title: string, hits: CatalogCardHit[]) => {
    const filtered = hits.filter((h) => {
      if (input.selectedId && h.id === input.selectedId) return false;
      if (seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });
    if (filtered.length === 0) return;
    groups.push({ id, title, hits: filtered.slice(0, 8) });
  };

  addGroup("binder-recent", "Recently added from this binder", input.binderRecent);
  addGroup("nearby", "Nearby numbers in this set", input.nearby);
  addGroup("set", "Other cards from this set", input.bySet);
  addGroup("global-recent", "Recently added cards", input.globalRecent);

  return groups;
}

export function shouldLoadSuggestions(input: {
  binderId: string;
  setId?: string | null;
  selectedId?: string | null;
}): boolean {
  if (!input.binderId?.trim()) return false;
  return Boolean(input.setId?.trim() || input.selectedId?.trim() || input.binderId.trim());
}
