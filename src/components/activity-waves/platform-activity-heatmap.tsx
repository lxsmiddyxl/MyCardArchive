"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { PlatformActivityWavePayloadDTO, PlatformWaveCellDTO } from "@/lib/dto/activity-waves";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

const ROW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellTone(band: string): string {
  switch (band) {
    case "very_active":
      return "bg-emerald-500/50";
    case "active":
      return "bg-emerald-400/40";
    case "steady":
      return "bg-amber-400/35";
    case "quiet":
      return "bg-slate-500/30";
    case "sleeping":
    default:
      return "bg-mca-chrome/45";
  }
}

type WaveView = {
  cells: PlatformWaveCellDTO[];
  headline: string;
  spotlights: string[];
};

/** 24×7 qualitative grid — UTC buckets; no numeric counts (Phase 27). */
export function PlatformActivityHeatmap({ className }: { className?: string }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading } = useAsyncState<WaveView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<PlatformActivityWavePayloadDTO>("/api/activity-waves/platform", {
        cache: "no-store",
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const body = r.data;
      return {
        cells: Array.isArray(body.cells) ? body.cells : [],
        headline: typeof body.headline === "string" ? body.headline : "",
        spotlights: Array.isArray(body.spotlights) ? body.spotlights : [],
      };
    });
  }, [run]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const cells = data?.cells ?? [];
  const headline = data?.headline ?? "";
  const spotlights = data?.spotlights ?? [];

  return (
    <Panel className={cn("border border-mca-border/80 bg-mca-surface-elevated/35 p-mca-md", className)}>
      <section aria-live="polite" aria-busy={loading || !bootstrapped}>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Platform rhythm
        </p>
        <p className="mt-mca-xs text-sm font-medium text-mca-ink-body">
          {!bootstrapped ? "Rhythm loading…" : headline || "Rhythm snapshot unavailable."}
        </p>
        <p className="mt-mca-micro text-mca-caption text-mca-ink-muted">
          Coarse UTC grid — rolling hobby energy, not individuals.
        </p>
        <div className="mt-mca-md space-y-mca-xs overflow-x-auto pb-mca-xs">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="flex items-center gap-mca-xs">
              <span className="w-8 shrink-0 text-mca-caption font-medium uppercase tracking-wide text-mca-ink-muted">
                {ROW_LABELS[day - 1]}
              </span>
              <div
                className="grid min-w-[min(100%,720px)] flex-1 gap-px"
                style={{ gridTemplateColumns: "repeat(24, minmax(6px, 1fr))" }}
              >
                {Array.from({ length: 24 }, (_, h) => {
                  const c = cells.find((x) => x.day_bucket === day && x.hour_bucket === h);
                  const band = c?.wave_band ?? "sleeping";
                  return (
                    <div
                      key={h}
                      className={cn(
                        "h-3 rounded-sm transition-all duration-200 ease-mca-standard",
                        cellTone(band)
                      )}
                      title={`${ROW_LABELS[day - 1]} · ${h}:00 UTC · ${band.replace(/_/g, " ")}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {spotlights.length > 0 ? (
          <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-subtle">
            {spotlights.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </Panel>
  );
}
