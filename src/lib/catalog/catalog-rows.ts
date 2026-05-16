import type { CatalogCardHit } from "@/lib/dto/catalog";

export const CATALOG_CARD_DETAIL_SELECT =
  "id, set_id, name, number, rarity, supertype, subtypes, image_small, image_large, catalog_sets(name, set_code)";

type CatalogSetEmbed = { name: string; set_code?: string | null } | { name: string; set_code?: string | null }[] | null;

export function setNameFromCatalogEmbed(
  embed: CatalogSetEmbed,
  fallbackSetId: string
): string {
  if (!embed) return fallbackSetId;
  const row = Array.isArray(embed) ? embed[0] : embed;
  return row?.name?.trim() || fallbackSetId;
}

export function mapCatalogDbRowToHit(row: {
  id: string;
  set_id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype?: string | null;
  subtypes?: string[];
  image_small?: string | null;
  image_large?: string | null;
  catalog_sets?: CatalogSetEmbed;
}): CatalogCardHit {
  return {
    id: row.id,
    name: row.name,
    set_id: row.set_id,
    set: setNameFromCatalogEmbed(row.catalog_sets ?? null, row.set_id),
    number: row.number ?? "",
    rarity: row.rarity,
    image_url: row.image_large ?? row.image_small ?? null,
    supertype: row.supertype ?? null,
    subtypes: Array.isArray(row.subtypes) ? row.subtypes : [],
    tcgplayer_id: row.id,
  };
}

/** Natural-ish sort for collector numbers (e.g. 2 before 10, 121/198 ordered). */
export function sortCatalogHitsByNumber(hits: CatalogCardHit[]): CatalogCardHit[] {
  const key = (n: string) => {
    const slash = n.split("/")[0]?.trim() ?? n;
    const digits = slash.replace(/[^\d]/g, "");
    return digits.length ? parseInt(digits, 10) : Number.MAX_SAFE_INTEGER;
  };
  return [...hits].sort((a, b) => {
    const ka = key(a.number);
    const kb = key(b.number);
    if (ka !== kb) return ka - kb;
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}
