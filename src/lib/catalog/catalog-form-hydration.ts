import type { CatalogCardHit } from "@/lib/dto/catalog";

export type CatalogCardDetailRow = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  set_id: string;
  supertype: string | null;
  subtypes: string[];
  image_small: string | null;
  image_large: string | null;
  catalog_sets?: { name: string } | { name: string }[] | null;
};

export type CatalogFormSelection = {
  catalogCardId: string;
  name: string;
  number: string;
  rarity: string;
  setId: string;
  setName: string;
  imageUrl: string;
  supertype: string;
  subtypes: string[];
  /** Pokémon TCG supertype used as primary "type" line in the form. */
  type: string;
  tcgplayerId: string;
};

function setNameFromEmbed(
  embed: CatalogCardDetailRow["catalog_sets"],
  fallbackSetId: string
): string {
  if (!embed) return fallbackSetId;
  const row = Array.isArray(embed) ? embed[0] : embed;
  return row?.name?.trim() || fallbackSetId;
}

export function catalogHitToSelection(hit: CatalogCardHit): CatalogFormSelection {
  const setId = hit.set_id?.trim() ?? "";
  const setName = hit.set?.trim() ?? setId;
  const supertype = hit.supertype?.trim() ?? "";
  const subtypes = hit.subtypes ?? [];
  return {
    catalogCardId: hit.id,
    name: hit.name,
    number: hit.number ?? "",
    rarity: hit.rarity?.trim() ?? "",
    setId,
    setName,
    imageUrl: hit.image_url?.trim() ?? "",
    supertype,
    subtypes,
    type: supertype || subtypes[0] || "",
    tcgplayerId: hit.tcgplayer_id?.trim() || hit.id,
  };
}

export function catalogDetailToSelection(row: CatalogCardDetailRow): CatalogFormSelection {
  const setName = setNameFromEmbed(row.catalog_sets, row.set_id);
  const supertype = row.supertype?.trim() ?? "";
  const subtypes = Array.isArray(row.subtypes) ? row.subtypes : [];
  return {
    catalogCardId: row.id,
    name: row.name,
    number: row.number ?? "",
    rarity: row.rarity?.trim() ?? "",
    setId: row.set_id,
    setName,
    imageUrl: row.image_large ?? row.image_small ?? "",
    supertype,
    subtypes,
    type: supertype || subtypes[0] || "",
    tcgplayerId: row.id,
  };
}

export function isCatalogFormLocked(
  selection: CatalogFormSelection | null,
  manualEdit: boolean
): boolean {
  return Boolean(selection?.catalogCardId) && !manualEdit;
}
