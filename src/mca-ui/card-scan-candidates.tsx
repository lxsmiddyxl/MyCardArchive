"use client";

import type { RankedScanCandidate } from "@/lib/scanning/phase3/types";
import { confidenceBand, confidenceBandLabel } from "@/lib/scanning/v1/confidence-label";
import { ScanVariantThumb } from "@/mca-ui/scan-variant-thumb";
import { variantBadgeFromGroup } from "@/mca-utils/scan/variant-badge";
import { MCA_MOTION_LIST_ITEM, MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type CardScanCandidatesProps = {
  topCandidate: RankedScanCandidate | null;
  secondaryCandidates: RankedScanCandidate[];
  selectedId: string | null;
  onSelect: (candidate: RankedScanCandidate) => void;
  className?: string;
};

function CandidateRow({
  candidate,
  selected,
  active,
  onSelect,
  rank,
  optionId,
}: {
  candidate: RankedScanCandidate;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  rank?: number;
  optionId: string;
}) {
  const band = confidenceBand(candidate.confidence);
  const variantBadge = variantBadgeFromGroup(candidate.variantGroup);
  return (
    <li role="presentation" className={MCA_MOTION_LIST_ITEM}>
      <button
        type="button"
        id={optionId}
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        onMouseEnter={onSelect}
        className={cn(
          "flex w-full items-center gap-mca-sm rounded-mca-control border px-mca-sm py-mca-tight text-left transition-all duration-200 ease-mca-standard focus-visible:outline focus-visible:ring-2 focus-visible:ring-mca-focus/60",
          selected || active
            ? "border-mca-accent-border/60 bg-mca-accent-border/10 ring-1 ring-inset ring-mca-accent-border/30"
            : "border-mca-border bg-mca-surface/40 hover:border-mca-field-border"
        )}
      >
        <ScanVariantThumb candidate={candidate} variantGroup={candidate.variantGroup} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">
            {rank != null ? (
              <span className="mr-mca-xs text-mca-caption text-mca-ink-subtle">#{rank}</span>
            ) : null}
            {candidate.card_name}
            {variantBadge ? (
              <span className="ml-mca-xs rounded-mca-pill border border-mca-border/70 bg-mca-chrome/50 px-mca-xs py-mca-trace text-[9px] font-semibold uppercase tracking-wide text-mca-ink-muted">
                {variantBadge}
              </span>
            ) : null}
          </p>
          <p className="truncate text-mca-caption text-mca-ink-muted">
            {candidate.set_name} · #{candidate.number}
          </p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            {confidenceBandLabel(band)} · {Math.round(candidate.confidence * 100)}%
            <span className="sr-only">
              {confidenceBandLabel(band)} match at {Math.round(candidate.confidence * 100)} percent.
              OCR {Math.round(candidate.ocrNumberScore * 100)}%, name{" "}
              {Math.round(candidate.fuzzyNameScore * 100)}%.
            </span>
          </p>
        </div>
      </button>
    </li>
  );
}

export function CardScanCandidates({
  topCandidate,
  secondaryCandidates,
  selectedId,
  onSelect,
  className,
}: CardScanCandidatesProps) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const all = useMemo(
    () => [...(topCandidate ? [topCandidate] : []), ...secondaryCandidates],
    [topCandidate, secondaryCandidates]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const idx = all.findIndex((c) => c.catalog_card_id === selectedId);
    if (idx >= 0) setActiveIndex(idx);
  }, [selectedId, all]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!all.length) return;
      const next = (activeIndex + delta + all.length) % all.length;
      setActiveIndex(next);
      onSelect(all[next]!);
    },
    [activeIndex, all, onSelect]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        if (all[0]) onSelect(all[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        if (all[all.length - 1]) onSelect(all[all.length - 1]!);
      }
    },
    [all, moveActive, onSelect]
  );

  const activeId = all[activeIndex]?.catalog_card_id ?? null;

  return (
    <div className={cn("space-y-mca-sm", className)}>
      {topCandidate ? (
        <div
          className={cn("overflow-hidden rounded-mca-card border border-mca-border", MCA_MOTION_PANEL)}
        >
          <p className="border-b border-mca-border/60 px-mca-sm py-mca-xs text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
            Top match
          </p>
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Top scan match"
            aria-activedescendant={activeId ? `${listId}-opt-${activeId}` : undefined}
            onKeyDown={onKeyDown}
            className="p-mca-xs"
          >
            <CandidateRow
              candidate={topCandidate}
              selected={selectedId === topCandidate.catalog_card_id}
              active={activeId === topCandidate.catalog_card_id}
              onSelect={() => onSelect(topCandidate)}
              rank={1}
              optionId={`${listId}-opt-${topCandidate.catalog_card_id}`}
            />
          </ul>
        </div>
      ) : null}

      {secondaryCandidates.length > 0 ? (
        <details
          open
          className={cn("rounded-mca-card border border-mca-border", MCA_MOTION_PANEL)}
        >
          <summary className="cursor-pointer select-none px-mca-sm py-mca-xs text-sm font-medium text-mca-ink-strong transition duration-200 ease-mca-standard">
            Alternate matches ({secondaryCandidates.length})
          </summary>
          <ul
            role="listbox"
            aria-label="Alternate scan matches"
            aria-activedescendant={
              activeId && secondaryCandidates.some((c) => c.catalog_card_id === activeId)
                ? `${listId}-opt-${activeId}`
                : undefined
            }
            onKeyDown={onKeyDown}
            className="max-h-64 space-y-mca-xs overflow-y-auto border-t border-mca-border/60 p-mca-xs"
          >
            {secondaryCandidates.map((c, i) => (
              <CandidateRow
                key={c.catalog_card_id}
                candidate={c}
                selected={selectedId === c.catalog_card_id}
                active={activeId === c.catalog_card_id}
                onSelect={() => onSelect(c)}
                rank={i + 2}
                optionId={`${listId}-opt-${c.catalog_card_id}`}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
