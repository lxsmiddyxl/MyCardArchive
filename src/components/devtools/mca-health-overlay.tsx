"use client";

import { fetchJson } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import {
  useSyntheticInpProbe,
  useVirtualizationRegression,
} from "@/lib/diagnostics/use-virtualization-regression";
import type { McaLogEnvelope } from "@/lib/logging/types";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    __MCA_HEALTH_RAF__?: { lastDeltaMs: number; maxDeltaMs: number; ts: number };
    __MCA_TELEMETRY__?: McaLogEnvelope[];
  }
}

type HealthJson = Record<string, unknown>;

const POLL_MS = 4000;

function readTelemetryWaterfalls(): { count: number; worstMs: number } {
  const buf = typeof window !== "undefined" ? window.__MCA_TELEMETRY__ ?? [] : [];
  let worstMs = 0;
  let count = 0;
  for (const e of buf) {
    if (
      typeof e.name === "string" &&
      e.name.includes("waterfall") &&
      e.name.startsWith("suspense.")
    ) {
      count += 1;
      const ms = typeof e.data?.ms === "number" && Number.isFinite(e.data.ms) ? e.data.ms : 0;
      worstMs = Math.max(worstMs, ms);
    }
  }
  return { count, worstMs };
}

function readVirtualTelemetryHints(): { viewportSamples: number } {
  const buf = typeof window !== "undefined" ? window.__MCA_TELEMETRY__ ?? [] : [];
  let viewportSamples = 0;
  for (const e of buf) {
    if (typeof e.name === "string" && e.name.includes("list.virtual") && e.name.includes("viewport")) {
      viewportSamples += 1;
    }
  }
  return { viewportSamples };
}

export function McaHealthOverlay() {
  const allowOverlay =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const stabilityMode = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";

  const [gate, setGate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [core, setCore] = useState<HealthJson | null>(null);
  const [realtime, setRealtime] = useState<HealthJson | null>(null);
  const [telemetry, setTelemetry] = useState<HealthJson | null>(null);
  const [rateLimits, setRateLimits] = useState<HealthJson | null>(null);
  const [diag, setDiag] = useState<HealthJson | null>(null);
  const [uiHealth, setUiHealth] = useState<HealthJson | null>(null);
  const [rafStats, setRafStats] = useState<{ lastDeltaMs: number; maxDeltaMs: number } | null>(null);
  const [clientTick, setClientTick] = useState(0);

  useVirtualizationRegression(Boolean(allowOverlay && stabilityMode && gate));
  useSyntheticInpProbe(Boolean(allowOverlay && stabilityMode && gate));

  useEffect(() => {
    setMounted(true);
    if (!allowOverlay) return;
    try {
      setGate(
        localStorage.getItem("mcaDevtools") === "1" || process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
      );
    } catch {
      setGate(process.env.NEXT_PUBLIC_STABILITY_MODE === "1");
    }
  }, [allowOverlay]);

  const fetchHealth = useCallback(async () => {
    if (!allowOverlay) return;
    const paths = [
      ["/api/health/core", setCore] as const,
      ["/api/health/realtime", setRealtime] as const,
      ["/api/health/telemetry", setTelemetry] as const,
      ["/api/health/rate-limits", setRateLimits] as const,
      ["/api/health/diagnostics", setDiag] as const,
      ["/api/health/ui", setUiHealth] as const,
    ];
    await Promise.all(
      paths.map(async ([path, setter]) => {
        const r = await fetchJson<HealthJson>(path, { cache: "no-store" });
        if (r.kind !== "ok") {
          setter({ ok: false, error: "fetch_failed" });
          return;
        }
        setter(r.data as HealthJson);
      })
    );
  }, [allowOverlay]);

  useEffect(() => {
    if (!mounted || !gate || !allowOverlay) return;
    void fetchHealth();
    const id = window.setInterval(() => void fetchHealth(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, gate, fetchHealth, allowOverlay]);

  const rafUiLast = useRef(0);
  useEffect(() => {
    if (!mounted || !gate || !allowOverlay) return;
    let id = 0;
    let last = performance.now();
    let maxDelta = 0;
    const tick = (t: number) => {
      const delta = t - last;
      last = t;
      maxDelta = Math.max(maxDelta, delta);
      window.__MCA_HEALTH_RAF__ = {
        lastDeltaMs: Math.round(delta),
        maxDeltaMs: Math.round(maxDelta),
        ts: Date.now(),
      };
      if (t - rafUiLast.current > 250) {
        rafUiLast.current = t;
        setRafStats({ lastDeltaMs: Math.round(delta), maxDeltaMs: Math.round(maxDelta) });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mounted, gate, allowOverlay]);

  useEffect(() => {
    if (!mounted || !gate || !allowOverlay) return;
    const id = window.setInterval(() => setClientTick((n) => n + 1), 1500);
    return () => window.clearInterval(id);
  }, [mounted, gate, allowOverlay]);

  void clientTick;
  const clientWaterfall = readTelemetryWaterfalls();
  const virtualHints = readVirtualTelemetryHints();

  useEffect(() => {
    if (!mounted || !gate || !allowOverlay) return;
    const rows = [core, realtime, telemetry, rateLimits, uiHealth].map((x) => x?.ok === false);
    if (rows.some(Boolean)) {
      console.warn("[MCA health] One or more health endpoints reported ok:false", {
        core: core?.ok,
        realtime: realtime?.ok,
        telemetry: telemetry?.ok,
        rateLimits: rateLimits?.ok,
        ui: uiHealth?.ok,
      });
    }
  }, [mounted, gate, allowOverlay, core, realtime, telemetry, rateLimits, uiHealth]);

  if (!mounted || !allowOverlay) return null;
  if (!gate) return null;

  const buckets = rateLimits?.buckets as Record<string, { used: number; limit: number }> | undefined;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[100] max-h-[min(70vh,520px)] w-[min(92vw,380px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA health (devtools)</div>
        <p className="mb-mca-sm text-mca-ink-muted">
          Set{" "}
          <code className="rounded-mca-control bg-mca-surface px-mca-xs py-mca-micro">
            localStorage.mcaDevtools=1
          </code>{" "}
          and reload.
        </p>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Core</div>
          <pre className="whitespace-pre-wrap break-words text-[10px] text-mca-ink-muted">
            {core ? JSON.stringify(core, null, 0) : "…"}
          </pre>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Realtime</div>
          <div>
            lastEventAgeMs:{" "}
            <span className="text-mca-ink-muted">{String(realtime?.lastEventAgeMs ?? "—")}</span>
          </div>
          <div>
            channel:{" "}
            <span className="text-mca-ink-muted">{String(realtime?.channelStatus ?? "—")}</span>
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Telemetry ingest</div>
          <div>
            disabled: <span className="text-mca-ink-muted">{String(telemetry?.disabled ?? "—")}</span>
          </div>
          <div>
            ingestOk: <span className="text-mca-ink-muted">{String(telemetry?.ingestOk ?? "—")}</span>
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Rate limits (saturation)</div>
          {buckets
            ? Object.entries(buckets).map(([route, v]) => {
                const pct = v.limit > 0 ? Math.round((100 * v.used) / v.limit) : 0;
                return (
                  <div key={route} className="flex justify-between gap-mca-sm">
                    <span className="truncate text-mca-ink-muted">{route}</span>
                    <span>
                      {v.used}/{v.limit} ({pct}%)
                    </span>
                  </div>
                );
              })
            : "—"}
        </Panel>

        {stabilityMode ? (
          <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
            <div className="font-medium text-mca-ink-strong">Stability (virtualization / INP)</div>
            <div className="text-mca-ink-muted">
              window.__MCA_VIRTUALIZATION_STATS__:{" "}
              {typeof window !== "undefined" && window.__MCA_VIRTUALIZATION_STATS__
                ? JSON.stringify(window.__MCA_VIRTUALIZATION_STATS__)
                : "—"}
            </div>
          </Panel>
        ) : null}

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">UI health</div>
          <div>
            responseTimeMs:{" "}
            <span className="text-mca-ink-muted">{String(uiHealth?.responseTimeMs ?? "—")}</span>
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Main thread (rAF)</div>
          <div>
            last Δms: <span className="text-mca-ink-muted">{rafStats?.lastDeltaMs ?? "—"}</span>
          </div>
          <div>
            max Δms: <span className="text-mca-ink-muted">{rafStats?.maxDeltaMs ?? "—"}</span>
          </div>
          <div className="text-mca-ink-muted">
            Virtual list viewport telemetry samples (session): {virtualHints.viewportSamples}
          </div>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Suspense waterfalls (client buffer)</div>
          <div>
            count: {clientWaterfall.count}, worst ms: {clientWaterfall.worstMs || "—"}
          </div>
        </Panel>

        <Panel className="space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Diagnostics snapshot</div>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-mca-ink-muted">
            {diag ? JSON.stringify(diag, null, 0) : "…"}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
