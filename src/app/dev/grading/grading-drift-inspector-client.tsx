"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useMemo, useState } from "react";

type DriftPayload = {
  sampleSize?: number;
  slopePerDay?: number;
  expectedShift7d?: number;
  intercept?: number;
  series?: { epoch?: number; overall?: number; at?: string }[];
  error?: string;
};

type HistRow = {
  id: string;
  computed_at: string;
  slope_per_day: number | null;
  expected_shift_7d: number;
  sample_size: number;
  calibration_delta: number | null;
};

export function GradingDriftInspectorClient() {
  const [drift, setDrift] = useState<DriftPayload | null>(null);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/grading/drift", { cache: "no-store" });
      const body = (await res.json()) as { drift?: DriftPayload; history?: HistRow[]; error?: string };
      if (!res.ok) {
        setErr(body.error ?? "Failed to load drift");
        return;
      }
      setDrift(body.drift ?? null);
      setHistory(Array.isArray(body.history) ? body.history : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chart = useMemo(() => {
    const s = drift?.series;
    if (!Array.isArray(s) || s.length < 2) return null;
    const vals = s.map((p) => (typeof p.overall === "number" ? p.overall : Number(p.overall ?? 0)));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = max === min ? 1 : (max - min) * 0.08;
    const lo = min - pad;
    const hi = max + pad;
    const w = 320;
    const h = 120;
    const pts = vals.map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * (w - 8) + 4;
      const y = h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
      return `${x},${Number.isFinite(y) ? y : h / 2}`;
    });
    return { polyline: pts.join(" "), w, h, lo, hi };
  }, [drift?.series]);

  const recalibrate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/grading/drift/recalibrate", { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Recalibrate failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Recalibrate failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <Panel className="space-y-mca-md border-mca-border bg-mca-surface-elevated/40 p-mca-lg">
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Temporal drift (v7)
        </p>
        <div className="flex flex-wrap gap-mca-sm">
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void recalibrate()}>
            Apply drift recalibration
          </Button>
        </div>
      </div>
      {err ? <p className="text-sm text-mca-error-text-strong">{err}</p> : null}
      {drift?.error ? <p className="text-sm text-mca-error-text-strong">{drift.error}</p> : null}
      {drift && !drift.error ? (
        <div className="space-y-mca-sm text-sm text-mca-ink-body">
          <p className="text-mca-ink-muted">
            Sample <span className="font-mono text-mca-ink-strong">{drift.sampleSize ?? 0}</span> · slope/day{" "}
            <span className="font-mono tabular-nums">{drift.slopePerDay?.toFixed?.(4) ?? drift.slopePerDay}</span> ·
            expected Δ (7d){" "}
            <span className="font-mono tabular-nums">{drift.expectedShift7d?.toFixed?.(2) ?? drift.expectedShift7d}</span>
          </p>
          {chart ? (
            <div className="rounded-mca-block border border-mca-border/80 bg-mca-surface/60 p-mca-sm">
              <p className="mb-mca-xs text-mca-caption text-mca-ink-subtle">Overall vs recent runs</p>
              <svg width={chart.w} height={chart.h} className="text-mca-accent" aria-hidden="true">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  points={chart.polyline}
                />
              </svg>
            </div>
          ) : (
            <p className="text-mca-caption text-mca-ink-subtle">Not enough graded runs for a drift chart yet.</p>
          )}
        </div>
      ) : !err ? (
        <p className="text-mca-body text-mca-ink-muted">Loading…</p>
      ) : null}

      {history.length > 0 ? (
        <div>
          <p className="mb-mca-xs text-mca-caption font-medium text-mca-ink-subtle">Recalibration history</p>
          <ul className="space-y-mca-xs text-mca-caption text-mca-ink-muted">
            {history.map((h) => (
              <li key={h.id} className="font-mono">
                {new Date(h.computed_at).toLocaleString()} · Δ7d {h.expected_shift_7d?.toFixed?.(2) ?? h.expected_shift_7d}{" "}
                · cal {h.calibration_delta != null ? h.calibration_delta.toFixed(2) : "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
