"use client";

import { fetchJson } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type LoadJson = {
  ok?: boolean;
  loadState?: string;
  degradationMode?: string;
  snapshot?: {
    eventLoopLagMs?: number;
    rafJitterProxy?: number;
    regionLatencyMs?: number;
    memoryHeapMb?: number;
  };
  ring?: Array<{ eventLoopLagMs?: number; rafJitterProxy?: number; ts?: number }>;
  sheddingEvents?: Array<{ rule?: string; ts?: number; loadState?: string }>;
};

const POLL_MS = 5000;

function Sparkline({ values }: { values: readonly number[] }) {
  if (values.length < 2) return <span className="text-mca-ink-muted">—</span>;
  const max = Math.max(...values, 1e-6);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-10 w-full text-mca-accent"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" points={pts} />
    </svg>
  );
}

export function McaLoadOverlay() {
  const enabled = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const [data, setData] = useState<LoadJson | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchLoad = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await fetchJson<LoadJson>("/api/health/load", { cache: "no-store" });
      setData(r.kind === "ok" ? (r.data as LoadJson) : null);
    } catch {
      setData({ ok: false });
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    void fetchLoad();
    const id = window.setInterval(() => void fetchLoad(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, enabled, fetchLoad]);

  if (!mounted || !enabled) return null;

  const ring = data?.ring ?? [];
  const lagSeries = ring.map((r) => r.eventLoopLagMs ?? 0);
  const jitterSeries = ring.map((r) => r.rafJitterProxy ?? 0);
  const events = data?.sheddingEvents ?? [];

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[103] max-h-[min(55vh,400px)] w-[min(92vw,300px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA load</div>
        <p className="mb-mca-sm text-mca-ink-muted">NEXT_PUBLIC_STABILITY_MODE=1 · shedding + degradation</p>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">State</div>
          <div className="text-mca-ink-muted">load: {data?.loadState ?? "…"}</div>
          <div className="text-mca-ink-muted">degrade: {data?.degradationMode ?? "…"}</div>
          <div className="text-mca-ink-muted">
            lag {data?.snapshot?.eventLoopLagMs?.toFixed(1) ?? "—"}ms · jitter{" "}
            {data?.snapshot?.rafJitterProxy?.toFixed(2) ?? "—"} · heap{" "}
            {data?.snapshot?.memoryHeapMb?.toFixed(1) ?? "—"}mb
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Event loop lag (ring)</div>
          <Sparkline values={lagSeries} />
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">rAF proxy jitter (ring)</div>
          <Sparkline values={jitterSeries} />
        </Panel>

        <Panel className="space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Recent shedding</div>
          <ul className="max-h-28 list-inside list-disc overflow-y-auto text-mca-ink-muted">
            {events.length === 0 ? (
              <li>—</li>
            ) : (
              events.slice(-8).map((e, i) => (
                <li key={`${e.rule}-${e.ts}-${i}`}>
                  {e.rule ?? "?"} · {e.loadState}
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
