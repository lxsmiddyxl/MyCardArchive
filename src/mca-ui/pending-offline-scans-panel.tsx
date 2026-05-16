"use client";

import { useCallback, useEffect, useState } from "react";
import { listPendingScans, type PendingScan } from "@/mca-utils/offline/cache";
import { flushPendingScans } from "@/mca-utils/offline/flush-pending-scans";
import { Button } from "@/mca-ui/button";
import { InlineError } from "@/mca-ui/inline-error";
import { cn } from "@/lib/ui/cn";

export function PendingOfflineScansPanel({ className }: { className?: string }) {
  const [rows, setRows] = useState<PendingScan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRows(await listPendingScans());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/15 p-mca-md",
        className
      )}
      role="region"
      aria-label="Pending offline scans"
    >
      <p className="text-sm font-medium text-mca-ink-strong">
        {rows.length} scan{rows.length === 1 ? "" : "s"} queued offline
      </p>
      <ul className="mt-mca-xs space-y-mca-trace text-mca-caption text-mca-ink-muted">
        {rows.map((r) => (
          <li key={r.id}>
            {new Date(r.createdAt).toLocaleString()}
            {r.lastError ? ` — ${r.lastError}` : ""}
          </li>
        ))}
      </ul>
      {err ? <InlineError className="mt-mca-sm">{err}</InlineError> : null}
      <Button
        type="button"
        variant="secondary"
        className="mt-mca-sm text-sm"
        disabled={syncing}
        onClick={() => {
          setSyncing(true);
          setErr(null);
          void flushPendingScans().then((r) => {
            setSyncing(false);
            if (r.errors.length) setErr(r.errors[0]?.message ?? "Some scans failed to sync");
            void refresh();
          });
        }}
      >
        {syncing ? "Syncing…" : "Retry sync"}
      </Button>
    </div>
  );
}
