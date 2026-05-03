"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { SetActivityWavePayloadDTO, SetClubWaveHourDTO } from "@/lib/dto/activity-waves";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

function barTone(band: string): string {
  switch (band) {
    case "very_active":
      return "bg-emerald-500/55";
    case "active":
      return "bg-emerald-400/45";
    case "steady":
      return "bg-amber-400/40";
    case "quiet":
      return "bg-slate-500/35";
    default:
      return "bg-mca-chrome/40";
  }
}

function barHeightClass(band: string): string {
  switch (band) {
    case "very_active":
      return "h-10";
    case "active":
      return "h-8";
    case "steady":
      return "h-6";
    case "quiet":
      return "h-4";
    default:
      return "h-3";
  }
}

type SetWaveView = {
  hours: SetClubWaveHourDTO[];
  headline: string;
};

export function SetActivityWave({ setId, className }: { setId: string; className?: string }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading } = useAsyncState<SetWaveView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<SetActivityWavePayloadDTO>(
        `/api/activity-waves/set?setId=${encodeURIComponent(setId)}`,
        { cache: "no-store" }
      );
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const body = r.data;
      return {
        hours: Array.isArray(body.hours) ? body.hours : [],
        headline: body.headline ?? "",
      };
    });
  }, [run, setId]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const hours = data?.hours ?? [];
  const headline = data?.headline ?? "";

  return (
    <Panel className={cn("border border-mca-border/80 bg-mca-surface-elevated/35 p-mca-md", className)}>
      <section aria-live="polite" aria-busy={loading || !bootstrapped}>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Set activity wave
        </p>
        <p className="mt-mca-xs text-sm font-medium text-mca-ink-body">
          {!bootstrapped ? "Wave loading…" : headline || "Wave snapshot unavailable."}
        </p>
        <p className="mt-mca-micro text-mca-caption text-mca-ink-muted">
          Hourly shape for this set — scans and catalog overlap only.
        </p>
        <div className="mt-mca-md flex h-14 items-end gap-px overflow-x-auto pb-mca-xs" aria-hidden>
          {hours.map((row) => (
            <div
              key={row.hour_bucket}
              className="flex w-4 shrink-0 flex-col items-center justify-end gap-mca-micro"
              title={`${row.hour_bucket}:00 UTC · ${row.wave_band.replace(/_/g, " ")}`}
            >
              <div
                className={cn(
                  "w-full max-w-[14px] rounded-t-sm transition-all duration-200 ease-mca-standard",
                  barTone(row.wave_band),
                  barHeightClass(row.wave_band)
                )}
              />
            </div>
          ))}
        </div>
      </section>
    </Panel>
  );
}
