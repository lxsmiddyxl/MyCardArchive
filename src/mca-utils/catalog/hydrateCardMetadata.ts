/**
 * Unified catalog metadata hydration for scan prefill + manual add (Phase 2).
 */

import type { CatalogFormSelection } from "@/lib/catalog/catalog-form-hydration";
import type { CatalogCardHit, AddCardPrefillPayload } from "@/lib/dto/catalog";
import { setNameFromCatalogEmbed } from "@/lib/catalog/catalog-rows";
import type { AutoMatchResult } from "@/lib/types/auto-match";

export type HydratedCardMetadata = {
  name: string;
  setId: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
  supertype: string;
  subtypes: string[];
  type: string;
  tcgplayerId: string;
  catalog_card_id: string;
};

export type CatalogDetailInput = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  set_id: string;
  supertype: string | null;
  subtypes: string[];
  image_small: string | null;
  image_large: string | null;
  catalog_sets?: { name: string; set_code?: string | null } | { name: string; set_code?: string | null }[] | null;
};

export function hydrateFromCatalogDetail(row: CatalogDetailInput): HydratedCardMetadata {
  const setName = setNameFromCatalogEmbed(row.catalog_sets ?? null, row.set_id);
  const supertype = row.supertype?.trim() ?? "";
  const subtypes = Array.isArray(row.subtypes) ? row.subtypes : [];
  return {
    name: row.name,
    setId: row.set_id,
    setName,
    number: row.number ?? "",
    rarity: row.rarity?.trim() ?? "",
    imageUrl: row.image_large ?? row.image_small ?? "",
    supertype,
    subtypes,
    type: supertype || subtypes[0] || "",
    tcgplayerId: row.id,
    catalog_card_id: row.id,
  };
}

export function hydrateFromCatalogHit(hit: CatalogCardHit): HydratedCardMetadata {
  const setId = hit.set_id?.trim() ?? "";
  const setName = hit.set?.trim() ?? setId;
  const supertype = hit.supertype?.trim() ?? "";
  const subtypes = hit.subtypes ?? [];
  return {
    name: hit.name,
    setId,
    setName,
    number: hit.number ?? "",
    rarity: hit.rarity?.trim() ?? "",
    imageUrl: hit.image_url?.trim() ?? "",
    supertype,
    subtypes,
    type: supertype || subtypes[0] || "",
    tcgplayerId: hit.tcgplayer_id?.trim() || hit.id,
    catalog_card_id: hit.id,
  };
}

export function hydrateFromScanBestMatch(
  bm: NonNullable<AutoMatchResult["best_match"]>
): HydratedCardMetadata {
  return {
    name: bm.card_name,
    setId: "",
    setName: bm.set_name?.trim() ?? "",
    number: bm.number === "—" ? "" : bm.number,
    rarity: bm.rarity?.trim() ?? "",
    imageUrl: bm.image_url?.trim() ?? "",
    supertype: "",
    subtypes: [],
    type: "",
    tcgplayerId: bm.catalog_card_id?.trim() ?? "",
    catalog_card_id: bm.catalog_card_id?.trim() ?? "",
  };
}

export function toAddCardPrefillPayload(meta: HydratedCardMetadata): AddCardPrefillPayload {
  return {
    name: meta.name,
    number: meta.number,
    rarity: meta.rarity,
    set_name: meta.setName || null,
    set_id: meta.setId || null,
    image_url: meta.imageUrl || null,
    catalog_card_id: meta.catalog_card_id,
    supertype: meta.supertype || null,
    subtypes: meta.subtypes,
  };
}

export function catalogFormSelectionToPanelData(
  sel: CatalogFormSelection
): {
  name: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
  supertype?: string;
  subtypes?: string[];
} {
  return {
    name: sel.name,
    setName: sel.setName,
    number: sel.number,
    rarity: sel.rarity,
    imageUrl: sel.imageUrl,
    supertype: sel.supertype,
    subtypes: sel.subtypes,
  };
}

export function toCardCreateBody(
  meta: HydratedCardMetadata,
  binderId: string,
  extras?: { scan_event_id?: string | null }
): Record<string, unknown> {
  return {
    binder_id: binderId,
    name: meta.name,
    number: meta.number || null,
    rarity: meta.rarity || null,
    ...(meta.setName ? { set_name: meta.setName } : {}),
    image_url: meta.imageUrl || null,
    catalog_card_id: meta.catalog_card_id,
    ...(extras?.scan_event_id ? { scan_event_id: extras.scan_event_id } : {}),
  };
}
