"use client";

import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type RegionHealthJson = {
  activeRegion?: string;
  primary?: { ok: boolean; latencyMs: number };
  secondary?: { ok: boolean; latencyMs: number };
  failoverEnabled?: boolean;
  timestamp?: number;
};

type Snapshot = {
  ok?: boolean;
  attempts?: Array<{
    name: string;
    ts: number;
    ok: boolean;
    recovered: boolean;
    data?: unknown;
  }>;
};

const POLL_MS = 5000;

export function McaRegionOverlay() {
  const enabled = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const [region, setRegion] = useState<RegionHealthJson | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [rRegion, rSnap] = await Promise.all([
        fetch("/api/health/region", { cache: "no-store" }),
        fetch("/api/internal/recovery/snapshot", { cache: "no-store" }),
      ]);
      setRegion((await rRegion.json()) as RegionHealthJson);
      setSnap((await rSnap.json()) as Snapshot);
    } catch {
      setRegion({ primary: { ok: false, latencyMs: 0 }, secondary: { ok: false, latencyMs: 0 } });
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    void fetchAll();
    const id = window.setInterval(() => void fetchAll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, enabled, fetchAll]);

  if (!mounted || !enabled) return null;

  const attempts = snap?.attempts ?? [];
  const failoverAttempts = attempts.filter(
    (a) => a.name === "regionFailoverAction" || a.name === "regionFailbackAction"
  );

  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[101] max-h-[min(60vh,420px)] w-[min(92vw,340px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA regions</div>
        <p className="mb-mca-sm text-mca-ink-muted">
          NEXT_PUBLIC_STABILITY_MODE=1 · multi-region readiness
        </p>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Active region</div>
          <div className="text-mca-ink-muted">{region?.activeRegion ?? "…"}</div>
          <div className="text-mca-ink-muted">
            failover: {String(region?.failoverEnabled ?? false)}
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Health (aggregate latency)</div>
          <div className="text-mca-ink-muted">
            primary: ok={String(region?.primary?.ok ?? false)} · {region?.primary?.latencyMs ?? "—"}ms
          </div>
          <div className="text-mca-ink-muted">
            secondary: ok={String(region?.secondary?.ok ?? false)} ·{" "}
            {region?.secondary?.latencyMs ?? "—"}ms
          </div>
        </Panel>

        <Panel className="space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Failover / failback attempts</div>
          <ul className="max-h-32 list-inside list-disc overflow-y-auto text-mca-ink-muted">
            {failoverAttempts.length === 0 ? (
              <li>—</li>
            ) : (
              failoverAttempts.slice(-8).map((a) => (
                <li key={`${a.name}-${a.ts}`}>
                  {a.name} · ok={String(a.ok)} · recovered={String(a.recovered)} ·{" "}
                  {new Date(a.ts).toLocaleTimeString()}
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
