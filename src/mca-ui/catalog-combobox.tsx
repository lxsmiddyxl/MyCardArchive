"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import { CATALOG_AUTOCOMPLETE_LIMIT } from "@/lib/catalog/search";
import { Input, mcaInputClassName } from "@/mca-ui/input";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { cn } from "@/lib/ui/cn";
import { memo, useId } from "react";

export const CatalogAutocompleteRow = memo(function CatalogAutocompleteRow({
  hit,
  active,
  onPick,
}: {
  hit: CatalogCardHit;
  active: boolean;
  onPick: (h: CatalogCardHit) => void;
}) {
  return (
    <li role="presentation" className="border-b border-mca-border/80 last:border-0">
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={() => onPick(hit)}
        className={cn(
          "flex h-[52px] w-full gap-mca-sm px-mca-compact py-mca-tight text-left transition-all duration-200 ease-mca-standard",
          active
            ? "bg-mca-accent-border/15"
            : "hover:bg-mca-surface-elevated/80"
        )}
      >
        <div className="relative h-8 w-[23px] shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface-elevated">
          {hit.image_url ? (
            <RemoteCardThumb src={hit.image_url} alt="" sizes="32px" className="h-8 w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] text-mca-hint">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">
            {hit.name}{" "}
            {hit.number ? (
              <span className="font-mono text-mca-ink-subtle">#{hit.number}</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-mca-ink-subtle">
            {hit.set}
            {hit.rarity ? ` · ${hit.rarity}` : ""}
          </p>
        </div>
      </button>
    </li>
  );
});

export type CatalogSearchModeHint = "name" | "set" | "number";

export type CatalogComboboxProps = {
  id?: string;
  label?: string;
  value: string;
  onValueChange: (v: string) => void;
  hits: CatalogCardHit[];
  loading: boolean;
  error: string | null;
  showNoResults: boolean;
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
  onPick: (hit: CatalogCardHit) => void;
  onManualEditRequest?: () => void;
  disabled?: boolean;
  placeholder?: string;
  searchMode?: CatalogSearchModeHint;
  listLimit?: number;
};

export function CatalogCombobox({
  id: idProp,
  value,
  onValueChange,
  hits,
  loading,
  error,
  showNoResults,
  activeIndex,
  onActiveIndexChange,
  onPick,
  onManualEditRequest,
  disabled,
  placeholder = "Search Pokémon TCG catalog…",
  searchMode,
  listLimit = CATALOG_AUTOCOMPLETE_LIMIT,
}: CatalogComboboxProps) {
  const autoId = useId();
  const inputId = idProp ?? `catalog-combobox-${autoId}`;
  const listId = `${inputId}-listbox`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onActiveIndexChange(Math.min(hits.length - 1, activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onActiveIndexChange(Math.max(0, activeIndex - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && hits[activeIndex]) {
      e.preventDefault();
      onPick(hits[activeIndex]!);
    } else if (e.key === "Escape") {
      onActiveIndexChange(-1);
    }
  };

  const trimmed = value.trim();
  const openList = trimmed.length > 0 && (loading || hits.length > 0 || showNoResults || Boolean(error));

  return (
    <div className="relative">
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={openList}
        aria-controls={openList ? listId : undefined}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onActiveIndexChange(-1);
        }}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />

      {openList ? (
        <div
          className="absolute z-20 mt-mca-xs w-full overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface-elevated shadow-mca-panel"
          id={listId}
        >
          {error ? (
            <p className="px-mca-compact py-mca-sm text-xs text-mca-danger">{error}</p>
          ) : null}
          {loading ? (
            <div className="flex items-center gap-mca-sm px-mca-compact py-mca-sm text-xs text-mca-ink-subtle">
              <LoadingSpinner className="size-4 text-mca-accent/90" />
              Searching catalog…
            </div>
          ) : null}
          {!loading && showNoResults ? (
            <div className="space-y-mca-xs px-mca-compact py-mca-sm">
              <p className="text-xs text-mca-ink-subtle">No matches found — add manually</p>
              {onManualEditRequest ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-mca-accent underline-offset-2 hover:underline"
                  onClick={onManualEditRequest}
                >
                  Edit manually
                </button>
              ) : null}
            </div>
          ) : null}
          {!loading && hits.length > 0 ? (
            <div>
              {searchMode ? (
                <p className="border-b border-mca-border/80 px-mca-compact py-mca-tight text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                  {searchMode === "set"
                    ? "Set search"
                    : searchMode === "number"
                      ? "Number search"
                      : "Name search"}
                </p>
              ) : null}
            <ul role="listbox" aria-label="Catalog matches" className="max-h-[min(320px,52px*10)] overflow-auto">
              {hits.slice(0, listLimit).map((hit, i) => (
                <CatalogAutocompleteRow
                  key={hit.id}
                  hit={hit}
                  active={i === activeIndex}
                  onPick={onPick}
                />
              ))}
            </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
