import type { CatalogCardHit } from "@/lib/dto/catalog";
import {
  hydrateFromCatalogDetail,
  hydrateFromCatalogHit,
  type CatalogDetailInput,
} from "@/mca-utils/catalog/hydrateCardMetadata";

export type CatalogCardDetailRow = CatalogDetailInput;

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

function hydratedToFormSelection(meta: ReturnType<typeof hydrateFromCatalogHit>): CatalogFormSelection {
  return {
    catalogCardId: meta.catalog_card_id,
    name: meta.name,
    number: meta.number,
    rarity: meta.rarity,
    setId: meta.setId,
    setName: meta.setName,
    imageUrl: meta.imageUrl,
    supertype: meta.supertype,
    subtypes: meta.subtypes,
    type: meta.type,
    tcgplayerId: meta.tcgplayerId,
  };
}

export function catalogHitToSelection(hit: CatalogCardHit): CatalogFormSelection {
  return hydratedToFormSelection(hydrateFromCatalogHit(hit));
}

export function catalogDetailToSelection(row: CatalogCardDetailRow): CatalogFormSelection {
  return hydratedToFormSelection(hydrateFromCatalogDetail(row));
}

export function isCatalogFormLocked(
  selection: CatalogFormSelection | null,
  manualEdit: boolean
): boolean {
  return Boolean(selection?.catalogCardId) && !manualEdit;
}
