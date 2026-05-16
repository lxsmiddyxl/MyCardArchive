"use client";

import type { RankedScanCandidate } from "@/lib/scanning/phase3/types";
import { confidenceBand, confidenceBandLabel } from "@/lib/scanning/v1/confidence-label";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";

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
  onSelect,
  rank,
}: {
  candidate: RankedScanCandidate;
  selected: boolean;
  onSelect: () => void;
  rank?: number;
}) {
  const band = confidenceBand(candidate.confidence);
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-mca-sm rounded-mca-control border px-mca-sm py-mca-tight text-left transition-all duration-200 ease-mca-standard",
          selected
            ? "border-mca-accent-border/60 bg-mca-accent-border/10 ring-1 ring-inset ring-mca-accent-border/30"
            : "border-mca-border bg-mca-surface/40 hover:border-mca-field-border"
        )}
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
          {candidate.image_url ? (
            <RemoteCardThumb
              src={candidate.image_url}
              alt=""
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-mca-hint">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">
            {rank != null ? (
              <span className="mr-mca-xs text-mca-caption text-mca-ink-subtle">#{rank}</span>
            ) : null}
            {candidate.card_name}
          </p>
          <p className="truncate text-mca-caption text-mca-ink-muted">
            {candidate.set_name} · #{candidate.number}
            {candidate.variantGroup !== "standard" ? ` · ${candidate.variantGroup}` : ""}
          </p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            {confidenceBandLabel(band)} · {Math.round(candidate.confidence * 100)}%
            <span className="sr-only">
              OCR {Math.round(candidate.ocrNumberScore * 100)}%, name{" "}
              {Math.round(candidate.fuzzyNameScore * 100)}%
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
  const alternates = secondaryCandidates;
  const hasAlternates = alternates.length > 0;

  return (
    <div className={cn("space-y-mca-sm", className)}>
      {topCandidate ? (
        <div className={cn("overflow-hidden rounded-mca-card border border-mca-border", MCA_MOTION_PANEL)}>
          <p className="border-b border-mca-border/60 px-mca-sm py-mca-xs text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
            Top match
          </p>
          <ul role="listbox" aria-label="Top scan match" className="p-mca-xs">
            <CandidateRow
              candidate={topCandidate}
              selected={selectedId === topCandidate.catalog_card_id}
              onSelect={() => onSelect(topCandidate)}
              rank={1}
            />
          </ul>
        </div>
      ) : null}

      {hasAlternates ? (
        <details className={cn("rounded-mca-card border border-mca-border", MCA_MOTION_PANEL)}>
          <summary className="cursor-pointer select-none px-mca-sm py-mca-xs text-sm font-medium text-mca-ink-strong transition duration-200 ease-mca-standard">
            Alternate matches ({alternates.length})
          </summary>
          <ul
            role="listbox"
            aria-label="Alternate scan matches"
            className="max-h-64 space-y-mca-xs overflow-y-auto border-t border-mca-border/60 p-mca-xs"
          >
            {alternates.map((c, i) => (
              <CandidateRow
                key={c.catalog_card_id}
                candidate={c}
                selected={selectedId === c.catalog_card_id}
                onSelect={() => onSelect(c)}
                rank={i + 2}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
