"use client";

import { flushPendingCardAdds } from "@/mca-utils/offline/flush-pending-card-adds";
import { listPendingCardAdds, type PendingCardAdd } from "@/mca-utils/offline/cache";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useState } from "react";

export function PendingOfflinePanel({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PendingCardAdd[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRows(await listPendingCardAdds());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (rows.length === 0 && !open) {
    return (
      <button
        type="button"
        className={cn("text-xs font-semibold text-mca-accent underline-offset-2 hover:underline", className)}
        onClick={() => setOpen(true)}
      >
        View pending offline adds
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-mca-card border border-mca-warning-surface-border/40 bg-mca-warning-surface/15 p-mca-compact",
        MCA_MOTION_PANEL,
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <button
          type="button"
          className="text-xs font-semibold text-mca-ink-body underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Pending offline adds ({rows.length})
        </button>
        <button
          type="button"
          disabled={syncing || rows.length === 0}
          className="rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-sm py-mca-tight text-xs font-semibold text-mca-accent transition duration-200 ease-mca-standard hover:border-mca-accent-border/40 disabled:opacity-50"
          onClick={() => {
            setSyncing(true);
            setLastResult(null);
            void flushPendingCardAdds().then(async (r) => {
              await refresh();
              setSyncing(false);
              setLastResult(
                r.synced > 0 || r.failed > 0
                  ? `Synced ${r.synced}, failed ${r.failed}`
                  : "Nothing to sync"
              );
            });
          }}
        >
          {syncing ? "Retrying…" : "Retry sync"}
        </button>
      </div>
      {open ? (
        <ul className="mt-mca-sm space-y-mca-xs text-xs text-mca-ink-muted">
          {rows.map((r) => (
            <li key={r.id} className="rounded-mca-control border border-mca-border/60 px-mca-sm py-mca-tight">
              <span className="font-medium text-mca-ink-body">
                {typeof r.body.name === "string" ? r.body.name : "Card"}
              </span>
              {r.lastError ? (
                <p className="mt-mca-trace text-mca-danger">{r.lastError}</p>
              ) : null}
            </li>
          ))}
          {rows.length === 0 ? <li>No pending adds.</li> : null}
        </ul>
      ) : null}
      {lastResult ? <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">{lastResult}</p> : null}
    </div>
  );
}
