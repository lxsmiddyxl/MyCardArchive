"use client";

import type { CatalogFormSelection } from "@/lib/catalog/catalog-form-hydration";
import type { BinderAccent } from "@/lib/binders/binder-accent";
import {
  CardMetadataPanel,
  type CardMetadataPanelData,
} from "@/mca-ui/card-metadata-panel";

export function catalogSelectionToPanelData(sel: CatalogFormSelection): CardMetadataPanelData {
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

/** Scan-aligned confirmation preview for catalog-selected cards. */
export function CatalogCardPreview({
  selection,
  className,
  headerExtra,
  footer,
  accent,
}: {
  selection: CatalogFormSelection;
  className?: string;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: BinderAccent;
}) {
  return (
    <CardMetadataPanel
      data={catalogSelectionToPanelData(selection)}
      className={className}
      headerExtra={headerExtra}
      footer={footer}
      accent={accent}
    />
  );
}
