"use client";

import type { CatalogFormSelection } from "@/lib/catalog/catalog-form-hydration";
import { Panel } from "@/mca-ui/panel";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { cn } from "@/lib/ui/cn";

/** Scan-aligned confirmation preview for catalog-selected cards. */
export function CatalogCardPreview({
  selection,
  className,
}: {
  selection: CatalogFormSelection;
  className?: string;
}) {
  return (
    <Panel
      className={cn(
        "border-mca-accent-border/40 bg-mca-accent-border/10 p-mca-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Card preview
      </p>
      <div className="mt-mca-sm flex gap-mca-sm">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
          {selection.imageUrl ? (
            <RemoteCardThumb
              src={selection.imageUrl}
              alt=""
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-mca-hint">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">{selection.name}</p>
          <p className="truncate text-mca-caption text-mca-ink-muted">
            {selection.setName}
            {selection.number ? ` · #${selection.number}` : ""}
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            {selection.rarity || "—"}
            {selection.supertype ? ` · ${selection.supertype}` : ""}
          </p>
        </div>
      </div>
    </Panel>
  );
}
