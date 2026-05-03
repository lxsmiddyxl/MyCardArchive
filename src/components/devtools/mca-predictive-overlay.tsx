"use client";

import { fetchJson } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type Prediction = {
  name: string;
  ok: boolean;
  severity: string;
  confidence: number;
  signal: string;
  data?: { sparkline?: number[]; sparklineAnomaly?: number[]; sparklineOverscan?: number[] };
};

type PredictiveJson = {
  ok?: boolean;
  predictions?: Prediction[];
  highestSeverity?: string;
  timestamp?: number;
};

const POLL_MS = 6000;

function Sparkline({ values }: { values: readonly number[] }) {
  if (values.length < 2) {
    return <span className="text-mca-ink-muted">—</span>;
  }
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
      className="h-8 w-full text-mca-accent"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" points={pts} />
    </svg>
  );
}

function sparklineFor(p: Prediction): number[] {
  const d = p.data;
  if (!d) return [];
  if (Array.isArray(d.sparkline) && d.sparkline.length > 0) return d.sparkline;
  if (Array.isArray(d.sparklineAnomaly) && d.sparklineAnomaly.length > 0) return d.sparklineAnomaly;
  if (Array.isArray(d.sparklineOverscan) && d.sparklineOverscan.length > 0) return d.sparklineOverscan;
  return [];
}

export function McaPredictiveOverlay() {
  const enabled = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const [json, setJson] = useState<PredictiveJson | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchPredictive = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await fetchJson<PredictiveJson>("/api/health/predictive", { cache: "no-store" });
      setJson(r.kind === "ok" ? (r.data as PredictiveJson) : null);
    } catch {
      setJson({ ok: false, predictions: [] });
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    void fetchPredictive();
    const id = window.setInterval(() => void fetchPredictive(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, enabled, fetchPredictive]);

  if (!mounted || !enabled) return null;

  const preds = json?.predictions ?? [];
  const sev = json?.highestSeverity ?? "—";

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[102] max-h-[min(55vh,380px)] w-[min(92vw,320px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA predictive</div>
        <p className="mb-mca-sm text-mca-ink-muted">
          NEXT_PUBLIC_STABILITY_MODE=1 · early warnings
        </p>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Summary</div>
          <div className="text-mca-ink-muted">
            highest: {sev} · endpoint ok: {String(json?.ok ?? false)}
          </div>
        </Panel>

        <div className="space-y-mca-sm">
          {preds.length === 0 ? (
            <Panel className="p-mca-sm text-mca-ink-muted">No predictions (PREDICTIVE_MODE=0 or warming up)</Panel>
          ) : (
            preds.map((p) => (
              <Panel key={p.name} className="space-y-mca-xs p-mca-sm">
                <div className="font-medium text-mca-ink-strong">{p.name}</div>
                <div className="text-mca-ink-muted">
                  severity: {p.severity} · confidence: {(p.confidence ?? 0).toFixed(2)} · ok:{" "}
                  {String(p.ok)}
                </div>
                <div className="text-mca-ink-muted">{p.signal}</div>
                <div className="mt-mca-xs">
                  <Sparkline values={sparklineFor(p)} />
                </div>
              </Panel>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
