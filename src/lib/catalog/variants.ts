import type { CatalogCardHit } from "@/lib/dto/catalog";

export type CatalogVariantGroup = {
  key: string;
  name: string;
  number: string;
  setId: string;
  variants: CatalogCardHit[];
};

function variantKey(hit: CatalogCardHit): string {
  const setId = hit.set_id?.trim() ?? hit.set?.trim() ?? "";
  const name = hit.name.trim().toLowerCase();
  const number = (hit.number ?? "").trim().toLowerCase();
  return `${setId}|${name}|${number}`;
}

/** Human-readable variant label from catalog metadata. */
export function variantLabelFromHit(hit: CatalogCardHit): string {
  const parts: string[] = [];
  const sub = hit.subtypes ?? [];
  const subLower = sub.map((s) => s.toLowerCase());

  if (subLower.some((s) => s.includes("reverse"))) parts.push("Reverse holo");
  else if (subLower.some((s) => s.includes("holo"))) parts.push("Holo");
  else if (hit.rarity?.toLowerCase().includes("holo")) parts.push("Holo");

  if (subLower.some((s) => s.includes("alternate") || s.includes("alt"))) {
    parts.push("Alt art");
  }
  if (subLower.some((s) => s.includes("promo"))) parts.push("Promo");
  if (subLower.some((s) => s.includes("special") || s.includes("illustration"))) {
    parts.push("Special print");
  }

  if (hit.rarity?.trim()) parts.push(hit.rarity.trim());

  if (parts.length === 0) {
    return hit.id.length > 12 ? `Variant · ${hit.id.slice(-8)}` : hit.id;
  }

  return parts.join(" · ");
}

export function groupCatalogVariants(hits: CatalogCardHit[]): CatalogVariantGroup[] {
  const map = new Map<string, CatalogVariantGroup>();
  for (const hit of hits) {
    const key = variantKey(hit);
    const existing = map.get(key);
    if (existing) {
      if (!existing.variants.some((v) => v.id === hit.id)) {
        existing.variants.push(hit);
      }
    } else {
      map.set(key, {
        key,
        name: hit.name,
        number: hit.number ?? "",
        setId: hit.set_id?.trim() ?? "",
        variants: [hit],
      });
    }
  }
  return [...map.values()];
}

export function findMultiVariantGroups(hits: CatalogCardHit[]): CatalogVariantGroup[] {
  return groupCatalogVariants(hits).filter((g) => g.variants.length > 1);
}

export function pickPrimaryVariant(hits: CatalogCardHit[]): CatalogCardHit | null {
  if (!hits.length) return null;
  const groups = groupCatalogVariants(hits);
  if (groups.length === 1 && groups[0]!.variants.length === 1) {
    return groups[0]!.variants[0]!;
  }
  return hits[0] ?? null;
}
