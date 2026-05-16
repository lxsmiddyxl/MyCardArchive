"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import type { SuggestionGroup } from "@/lib/catalog/suggestions";
import { CatalogAutocompleteRow } from "@/mca-ui/catalog-combobox";
import { cn } from "@/lib/ui/cn";

export type CatalogSuggestionsStripProps = {
  groups: SuggestionGroup[];
  loading?: boolean;
  onPick: (hit: CatalogCardHit) => void;
  className?: string;
};

export function CatalogSuggestionsStrip({
  groups,
  loading,
  onPick,
  className,
}: CatalogSuggestionsStripProps) {
  if (!loading && groups.length === 0) return null;

  return (
    <div
      className={cn(
        "space-y-mca-sm rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/30 p-mca-compact",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Smart suggestions
      </p>
      {loading ? (
        <p className="text-xs text-mca-ink-muted">Loading suggestions…</p>
      ) : (
        groups.map((group) => (
          <SuggestionGroupBlock key={group.id} group={group} onPick={onPick} />
        ))
      )}
    </div>
  );
}

function SuggestionGroupBlock({
  group,
  onPick,
}: {
  group: SuggestionGroup;
  onPick: (hit: CatalogCardHit) => void;
}) {
  return (
    <div className="space-y-mca-xs">
      <p className="text-xs font-medium text-mca-ink-body">{group.title}</p>
      <ul className="overflow-hidden rounded-mca-control border border-mca-border/80">
        {group.hits.map((hit) => (
          <CatalogAutocompleteRow key={hit.id} hit={hit} active={false} onPick={onPick} />
        ))}
      </ul>
    </div>
  );
}
