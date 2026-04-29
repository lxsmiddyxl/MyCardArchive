"use client";

import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type HotPathRow = {
  id: string;
  budget: number;
  p95: number;
  ok: boolean;
  samples: number;
  overBudgetByMs?: number;
};

type DiagJson = {
  perf?: {
    hotPaths?: HotPathRow[];
    cache?: { hits: number; misses: number; hitRatio: number; evictions: number; size: number };
  };
};

const POLL_MS = 8000;

export function McaPerfOverlay() {
  const enabled = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const [diag, setDiag] = useState<DiagJson | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchDiag = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/health/diagnostics", { cache: "no-store" });
      setDiag((await res.json()) as DiagJson);
    } catch {
      setDiag(null);
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    void fetchDiag();
    const id = window.setInterval(() => void fetchDiag(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, enabled, fetchDiag]);

  if (!mounted || !enabled) return null;

  const hotPaths = diag?.perf?.hotPaths ?? [];
  const cache = diag?.perf?.cache;

  return (
    <div className="pointer-events-none fixed left-3 bottom-[min(42vh,320px)] z-[104] max-h-[min(48vh,360px)] w-[min(92vw,320px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA perf</div>
        <p className="mb-mca-sm text-mca-ink-muted">Hot paths vs budget · cache health</p>

        <Panel className="mb-mca-sm max-h-48 space-y-mca-xs overflow-y-auto p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Hot paths (p95 vs budget)</div>
          {hotPaths.length === 0 ? (
            <div className="text-mca-ink-muted">—</div>
          ) : (
            hotPaths.map((h) => (
              <div key={h.id} className="border-b border-mca-border/60 pb-mca-xs text-mca-ink-muted last:border-0">
                <div className="font-mono text-[10px] text-mca-ink-strong">{h.id}</div>
                <div>
                  p95 {h.p95.toFixed(1)}ms / {h.budget}ms · samples {h.samples} · ok {String(h.ok)}
                </div>
                {h.budget > 0 && (
                  <div className="mt-mca-xs h-1.5 w-full overflow-hidden rounded bg-mca-chrome/40">
                    <div
                      className={`h-full ${h.ok ? "bg-mca-accent/80" : "bg-mca-warning-tint/90"}`}
                      style={{ width: `${Math.min(100, (h.p95 / h.budget) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </Panel>

        <Panel className="space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Cache</div>
          <div className="text-mca-ink-muted">
            hits {cache?.hits ?? "—"} · misses {cache?.misses ?? "—"} · ratio{" "}
            {typeof cache?.hitRatio === "number" ? cache.hitRatio.toFixed(3) : "—"} · evictions{" "}
            {cache?.evictions ?? "—"}
          </div>
        </Panel>
      </div>
    </div>
  );
}
