"use client";

import type { ScanHistoryEntryDTO } from "@/lib/dto/scan-add";
import { confidenceBand, confidenceBandLabel } from "@/lib/scanning/v1/confidence-label";
import type { CatalogMatchConfidenceBand } from "@/mca-utils/catalog/confidence";
import { CardConfidenceBadge } from "@/mca-ui/card-confidence-badge";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";

export type ScanHistoryPanelProps = {
  entries: ScanHistoryEntryDTO[];
  loading?: boolean;
  binderId?: string;
  className?: string;
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

export function ScanHistoryPanel({
  entries,
  loading,
  binderId,
  className,
}: ScanHistoryPanelProps) {
  if (loading) {
    return (
      <p className="text-sm text-mca-ink-muted" role="status" aria-busy="true">
        Loading recent scans…
      </p>
    );
  }
  if (entries.length === 0) return null;

  return (
    <section
      className={cn("space-y-mca-sm", MCA_MOTION_PANEL, className)}
      aria-labelledby="scan-history-heading"
    >
      <h3 id="scan-history-heading" className="text-sm font-semibold text-mca-ink-strong">
        Recent scans
      </h3>
      <ul className="space-y-mca-xs" aria-label="Recent scan history">
        {entries.map((e) => {
          const scanBand = confidenceBand(e.confidence);
          const catalogBand = scanBandToCatalog(e.confidence);
          return (
            <li
              key={e.id}
              className="flex items-center gap-mca-sm rounded-mca-control border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-tight"
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-mca-control border border-mca-border">
                {e.image_url ? (
                  <RemoteCardThumb src={e.image_url} alt="" sizes="36px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-mca-hint">—</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-mca-ink-strong">
                  {e.card_name ?? "Unknown card"}
                </p>
                <p className="truncate text-mca-caption text-mca-ink-muted">
                  {e.set_name ?? "Set"} · #{e.number ?? "—"}
                </p>
                <p className="text-mca-caption text-mca-ink-subtle">
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
              <span title={confidenceBandLabel(scanBand)}>
                <CardConfidenceBadge band={catalogBand} />
              </span>
              {binderId && e.best_catalog_card_id ? (
                <Link
                  href={addCardHref(e, binderId)}
                  className="inline-flex shrink-0 items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-sm py-mca-trace text-xs font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
                >
                  Add
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
