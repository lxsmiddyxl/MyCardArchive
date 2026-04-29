"use client";

import type { McaLogEnvelope } from "@/lib/logging/types";
import { useEffect, useRef } from "react";

export type VirtualizationStats = {
  renderLoops: number;
  overscanHits: number;
  unexpectedRerenders: number;
  layoutThrashScore: number;
};

declare global {
  interface Window {
    __MCA_VIRTUALIZATION_STATS__?: VirtualizationStats;
    __MCA_TELEMETRY__?: McaLogEnvelope[];
  }
}

function stabilityClientEnabled(): boolean {
  return (
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
  );
}

/** Overscan / viewport signals from existing list.virtual telemetry (no MCA-UI changes). */
function overscanFromTelemetryBuffer(): number {
  const buf = window.__MCA_TELEMETRY__ ?? [];
  let n = 0;
  for (const e of buf) {
    if (
      typeof e.name === "string" &&
      e.name.includes("list.virtual") &&
      e.name.includes("viewport")
    ) {
      n += 1;
    }
  }
  return n;
}

/**
 * Tracks lightweight virtualization / main-thread proxies for Phase 49.
 * Writes {@link Window.__MCA_VIRTUALIZATION_STATS__} and POSTs to `/api/internal/stability/metrics`
 * when `NEXT_PUBLIC_STABILITY_MODE=1` and server `STABILITY_MODE=1`.
 */
export function useVirtualizationRegression(enabled: boolean): void {
  const rafTicks = useRef(0);
  const layoutJank = useRef(0);

  useEffect(() => {
    if (!enabled || !stabilityClientEnabled()) return;
    let id = 0;
    const tick = () => {
      rafTicks.current += 1;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !stabilityClientEnabled()) return;
    let ro: ResizeObserver | undefined;
    try {
      ro = new ResizeObserver(() => {
        layoutJank.current += 1;
      });
      ro.observe(document.body);
    } catch {
      /* ResizeObserver unavailable */
    }
    return () => ro?.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !stabilityClientEnabled()) return;

    const flush = () => {
      const overscanHits = overscanFromTelemetryBuffer();
      const stats: VirtualizationStats = {
        renderLoops: rafTicks.current,
        overscanHits,
        unexpectedRerenders: 0,
        layoutThrashScore: Math.min(100, layoutJank.current),
      };
      window.__MCA_VIRTUALIZATION_STATS__ = stats;
      void fetch("/api/internal/stability/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ virtualization: stats }),
        keepalive: true,
      }).catch(() => {});
    };

    flush();
    const id = window.setInterval(flush, 2500);
    return () => clearInterval(id);
  }, [enabled]);
}

/**
 * Synthetic input → paint delay (double rAF), for INP-like signals when stability mode is on.
 */
export function useSyntheticInpProbe(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !stabilityClientEnabled()) return;

    let samples = 0;
    const run = () => {
      const t0 = performance.now();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const lastMs = Math.round((performance.now() - t0) * 100) / 100;
          samples += 1;
          void fetch("/api/internal/stability/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ syntheticInp: { lastMs, samples } }),
            keepalive: true,
          }).catch(() => {});
        });
      });
    };

    run();
    const id = window.setInterval(run, 8000);
    return () => clearInterval(id);
  }, [enabled]);
}
