"use client";

import type { CardHistoryEntryDTO } from "@/lib/dto/catalog";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { useState } from "react";

export type CardHistoryPanelProps = {
  totalCopies: number;
  entries: CardHistoryEntryDTO[];
  loading?: boolean;
  className?: string;
};

export function CardHistoryPanel({
  totalCopies,
  entries,
  loading,
  className,
}: CardHistoryPanelProps) {
  const [open, setOpen] = useState(false);

  if (!loading && totalCopies <= 0) return null;

  return (
    <div
      className={cn(
        "rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/30",
        MCA_MOTION_PANEL,
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-mca-sm px-mca-compact py-mca-sm text-left transition duration-200 ease-mca-standard hover:bg-mca-surface-elevated/40"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Card history
        </span>
        <span className="text-xs text-mca-ink-muted">
          {loading ? "Loading…" : `${totalCopies} cop${totalCopies === 1 ? "y" : "ies"} owned`}
        </span>
      </button>
      {open && !loading ? (
        <ul className="border-t border-mca-border/60 px-mca-compact py-mca-sm text-xs text-mca-ink-body">
          {entries.map((e) => (
            <li key={e.card_id} className="flex justify-between gap-mca-sm py-mca-tight">
              <span className="truncate font-medium">{e.binder_name}</span>
              <time className="shrink-0 text-mca-ink-muted" dateTime={e.created_at}>
                {new Date(e.created_at).toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
