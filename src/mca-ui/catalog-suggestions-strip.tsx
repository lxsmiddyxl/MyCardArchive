"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import type { SuggestionGroup } from "@/lib/catalog/suggestions";
import { CatalogAutocompleteRow } from "@/mca-ui/catalog-combobox";
import type { BinderAccent } from "@/lib/binders/binder-accent";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CatalogSuggestionsStripProps = {
  groups: SuggestionGroup[];
  loading?: boolean;
  onPick: (hit: CatalogCardHit) => void;
  className?: string;
  setId?: string | null;
  setName?: string | null;
  onJumpToNumber?: (number: string) => void;
  highlightCardId?: string | null;
  accent?: BinderAccent;
};

function SuggestionSkeleton() {
  return (
    <div className="flex h-[52px] animate-pulse gap-mca-sm border-b border-mca-border/60 px-mca-compact py-mca-tight last:border-0">
      <div className="h-8 w-[23px] shrink-0 rounded-mca-control bg-mca-border/50" />
      <div className="min-w-0 flex-1 space-y-mca-xs py-mca-trace">
        <div className="h-3 w-3/4 rounded bg-mca-border/50" />
        <div className="h-2.5 w-1/2 rounded bg-mca-border/40" />
      </div>
    </div>
  );
}

export function CatalogSuggestionsStrip({
  groups,
  loading,
  onPick,
  className,
  setId,
  setName,
  onJumpToNumber,
  highlightCardId,
  accent,
}: CatalogSuggestionsStripProps) {
  const [jumpNumber, setJumpNumber] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightCardId?.trim()) return;
    const el = stripRef.current?.querySelector(`[data-suggestion-hit="${highlightCardId}"]`);
    if (el && "scrollIntoView" in el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightCardId, groups, loading]);

  if (!loading && groups.length === 0 && !setId) return null;

  const showSetLink = Boolean(setId?.trim());

  return (
    <div
      ref={stripRef}
      role="region"
      aria-label="Smart catalog suggestions"
      className={cn(
        "space-y-mca-sm rounded-mca-card border p-mca-compact",
        accent?.borderClass ?? "border-mca-border-subtle/80",
        accent?.surfaceClass ?? "bg-mca-surface/30",
        MCA_MOTION_PANEL,
        className
      )}
      style={accent?.color ? { borderColor: `${accent.color}44` } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <p
          className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle"
          style={accent?.color ? { color: accent.color } : undefined}
        >
          Smart suggestions
        </p>
        {showSetLink ? (
          <Link
            href={`/catalog/${encodeURIComponent(setId!.trim())}`}
            className="text-xs font-semibold text-mca-accent underline-offset-2 transition duration-200 ease-mca-standard hover:underline"
          >
            View full set{setName ? ` · ${setName}` : ""}
          </Link>
        ) : null}
      </div>

      {onJumpToNumber ? (
        <form
          className="flex flex-wrap items-end gap-mca-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const n = jumpNumber.trim();
            if (n) onJumpToNumber(n);
          }}
        >
          <label className="min-w-[8rem] flex-1 text-xs text-mca-ink-subtle">
            Jump to number
            <input
              type="text"
              inputMode="numeric"
              value={jumpNumber}
              onChange={(e) => setJumpNumber(e.target.value)}
              placeholder="e.g. 121"
              className="mca-input mt-mca-xs w-full rounded-mca-control px-mca-sm py-mca-tight text-sm"
              aria-label="Jump to card number in suggestions"
            />
          </label>
          <button
            type="submit"
            className="rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-sm py-mca-tight text-xs font-semibold text-mca-accent transition duration-200 ease-mca-standard hover:border-mca-accent-border/40"
          >
            Go
          </button>
        </form>
      ) : null}

      {loading ? (
        <ul className="overflow-hidden rounded-mca-control border border-mca-border/80">
          {Array.from({ length: 3 }).map((_, i) => (
            <SuggestionSkeleton key={i} />
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <p className="text-xs text-mca-ink-muted">No suggestions yet — search or pick a catalog card.</p>
      ) : (
        groups.map((group) => (
          <SuggestionGroupBlock
            key={group.id}
            group={group}
            onPick={onPick}
            highlightCardId={highlightCardId}
          />
        ))
      )}
    </div>
  );
}

function SuggestionGroupBlock({
  group,
  onPick,
  highlightCardId,
}: {
  group: SuggestionGroup;
  onPick: (hit: CatalogCardHit) => void;
  highlightCardId?: string | null;
}) {
  return (
    <div className="space-y-mca-xs">
      <p className="text-xs font-medium text-mca-ink-body">{group.title}</p>
      <ul className="max-h-[min(260px,52px*5)] overflow-auto rounded-mca-control border border-mca-border/80">
        {group.hits.map((hit) => (
          <div key={hit.id} data-suggestion-hit={hit.id}>
            <CatalogAutocompleteRow
              hit={hit}
              active={false}
              highlighted={highlightCardId === hit.id}
              onPick={onPick}
            />
          </div>
        ))}
      </ul>
    </div>
  );
}
