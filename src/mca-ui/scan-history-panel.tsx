"use client";

import type { ScanHistoryEntryDTO, ScanHistoryResponseDTO } from "@/lib/dto/scan-add";
import { confidenceBand, confidenceBandLabel } from "@/lib/scanning/v1/confidence-label";
import type { RankedScanCandidate } from "@/lib/scanning/phase3/types";
import type { CatalogMatchConfidenceBand } from "@/mca-utils/catalog/confidence";
import { CardConfidenceBadge } from "@/mca-ui/card-confidence-badge";
import { ScanVariantThumb } from "@/mca-ui/scan-variant-thumb";
import { variantBadgeFromGroup } from "@/mca-utils/scan/variant-badge";
import { Button } from "@/mca-ui/button";
import { fetchJson } from "@/lib/client";
import { MCA_MOTION_LIST_ITEM, MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { EmptyStateScans } from "@/mca-ui/empty-states/EmptyStateScans";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 10;

export type ScanHistoryPanelProps = {
  entries?: ScanHistoryEntryDTO[];
  loading?: boolean;
  binderId?: string;
  className?: string;
  /** Load history with pagination when parent does not supply entries. */
  selfFetch?: boolean;
};

function scanBandToCatalog(conf: number): CatalogMatchConfidenceBand {
  if (conf >= 0.7) return "high";
  if (conf >= 0.48) return "medium";
  return "low";
}

function addCardHref(entry: ScanHistoryEntryDTO, binderId: string): string {
  const q = new URLSearchParams();
  if (entry.card_name) q.set("name", entry.card_name);
  if (entry.number) q.set("number", entry.number);
  if (entry.best_catalog_card_id) q.set("catalog_card_id", entry.best_catalog_card_id);
  if (entry.set_name) q.set("set_name", entry.set_name);
  if (entry.scan_event_id) q.set("scan_event_id", entry.scan_event_id);
  return `/binders/${encodeURIComponent(binderId)}/add-card?${q}`;
}

function historyRowToCandidate(e: ScanHistoryEntryDTO): RankedScanCandidate | null {
  if (!e.best_catalog_card_id) return null;
  return {
    card_name: e.card_name ?? "Unknown",
    set_name: e.set_name ?? "",
    number: e.number ?? "—",
    rarity: null,
    image_url: e.image_url,
    confidence: e.confidence,
    catalog_card_id: e.best_catalog_card_id,
    set_id: null,
    variantGroup: e.variant_hint ?? "standard",
    setSymbolScore: 0,
    ocrNumberScore: 0,
    fuzzyNameScore: 0,
    imageSimilarityScore: 0,
  };
}

export function ScanHistoryPanel({
  entries: entriesProp,
  loading: loadingProp,
  binderId,
  className,
  selfFetch = false,
}: ScanHistoryPanelProps) {
  const [internalEntries, setInternalEntries] = useState<ScanHistoryEntryDTO[]>([]);
  const [internalLoading, setInternalLoading] = useState(selfFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setInternalLoading(true);
    const r = await fetchJson<ScanHistoryResponseDTO>(
      `/api/scan/history?limit=${PAGE_SIZE}&offset=${nextOffset}`,
      { cache: "no-store" }
    );
    if (append) setLoadingMore(false);
    else setInternalLoading(false);
    if (r.kind !== "ok") return;
    setInternalEntries((prev) => (append ? [...prev, ...r.data.entries] : r.data.entries));
    setHasMore(r.data.has_more);
    setOffset(r.data.next_offset);
  }, []);

  useEffect(() => {
    if (!selfFetch) return;
    void loadPage(0, false);
  }, [selfFetch, loadPage]);

  const displayEntries = selfFetch ? internalEntries : (entriesProp ?? []);
  const displayLoading = selfFetch ? internalLoading : (loadingProp ?? false);

  if (displayLoading && displayEntries.length === 0) {
    return (
      <p className="text-sm text-mca-ink-muted" role="status" aria-busy="true">
        Loading recent scans…
      </p>
    );
  }
  if (displayEntries.length === 0) {
    return selfFetch ? <EmptyStateScans /> : null;
  }

  return (
    <section
      className={cn("space-y-mca-sm", MCA_MOTION_PANEL, className)}
      aria-labelledby="scan-history-heading"
    >
      <h3 id="scan-history-heading" className="text-sm font-semibold text-mca-ink-strong">
        Recent scans
      </h3>
      <ul className="space-y-mca-xs" aria-label="Recent scan history">
        {displayEntries.map((e) => {
          const scanBand = confidenceBand(e.confidence);
          const catalogBand = scanBandToCatalog(e.confidence);
          const variantBadge = variantBadgeFromGroup(e.variant_hint);
          const candidate = historyRowToCandidate(e);
          const ariaLabel = [
            e.card_name ?? "Unknown card",
            e.set_name,
            e.number ? `number ${e.number}` : null,
            confidenceBandLabel(scanBand),
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li
              key={e.id}
              className={cn(
                "flex items-center gap-mca-sm rounded-mca-control border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-tight",
                MCA_MOTION_LIST_ITEM
              )}
              aria-label={ariaLabel}
            >
              {candidate ? (
                <ScanVariantThumb candidate={candidate} variantGroup={e.variant_hint} size="sm" />
              ) : (
                <div
                  className="h-8 w-[23px] shrink-0 rounded-mca-control border border-dashed border-mca-border"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-mca-ink-strong">
                  {e.card_name ?? "Unknown card"}
                  {variantBadge ? (
                    <span className="ml-mca-xs rounded-mca-pill border border-mca-border/70 px-mca-xs text-[9px] font-semibold uppercase text-mca-ink-muted">
                      {variantBadge}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-mca-caption text-mca-ink-muted">
                  {e.set_name ?? "Set"} · #{e.number ?? "—"}
                </p>
                <time className="text-mca-caption text-mca-ink-subtle" dateTime={e.created_at}>
                  {new Date(e.created_at).toLocaleString()}
                </time>
              </div>
              <CardConfidenceBadge band={catalogBand} />
              <div className="flex shrink-0 flex-col gap-mca-trace">
                {binderId && e.best_catalog_card_id ? (
                  <Link
                    href={addCardHref(e, binderId)}
                    className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-sm py-mca-trace text-xs font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
                  >
                    Add
                  </Link>
                ) : null}
                <Link
                  href="/scan/v2"
                  className="inline-flex items-center justify-center px-mca-sm py-mca-trace text-xs font-medium text-mca-accent-strong transition duration-200 ease-mca-standard hover:underline"
                >
                  Re-scan
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {selfFetch && hasMore ? (
        <Button
          type="button"
          variant="secondary"
          disabled={loadingMore}
          className="text-sm"
          onClick={() => void loadPage(offset, true)}
        >
          {loadingMore ? "Loading…" : "Load more scans"}
        </Button>
      ) : null}
    </section>
  );
}
