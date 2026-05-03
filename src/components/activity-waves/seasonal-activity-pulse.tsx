"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { SeasonalWavePayloadDTO, SetClubWaveHourDTO } from "@/lib/dto/activity-waves";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type PulseView = {
  pulseHeadline: string;
  hours: SetClubWaveHourDTO[];
};

export function SeasonalActivityPulse({
  seasonId,
  className,
}: {
  seasonId: string;
  className?: string;
}) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading } = useAsyncState<PulseView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<SeasonalWavePayloadDTO>(
        `/api/activity-waves/season?seasonId=${encodeURIComponent(seasonId)}`,
        { cache: "no-store" }
      );
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const body = r.data;
      return {
        pulseHeadline: typeof body.pulseHeadline === "string" ? body.pulseHeadline : "",
        hours: Array.isArray(body.hours) ? body.hours : [],
      };
    });
  }, [run, seasonId]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const pulseHeadline = data?.pulseHeadline ?? "";
  const hours = data?.hours ?? [];

  const hour = new Date().getUTCHours();
  const cur = hours.find((h) => h.hour_bucket === hour);
  const band = cur?.wave_band ?? "steady";

  const ring =
    band === "very_active"
      ? "border-emerald-400/70 shadow-[0_0_28px_rgba(52,211,153,0.35)]"
      : band === "active"
        ? "border-emerald-400/50 shadow-[0_0_22px_rgba(52,211,153,0.22)]"
        : band === "steady"
          ? "border-amber-400/45 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
          : band === "quiet"
            ? "border-slate-500/40"
            : "border-mca-border/60";

  return (
    <Panel className={cn("border border-mca-border/80 bg-mca-surface-elevated/35 p-mca-md", className)}>
      <section aria-live="polite" aria-busy={loading || !bootstrapped}>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Seasonal pulse
        </p>
        <div className="mt-mca-md flex items-center gap-mca-lg">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 bg-mca-surface/40 transition-all duration-200 ease-mca-standard",
              ring
            )}
            aria-hidden
          >
            <span className="text-2xl">✦</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-mca-ink-body">
              {!bootstrapped ? "Pulse loading…" : pulseHeadline || "Pulse snapshot unavailable."}
            </p>
            <p className="mt-mca-micro text-mca-caption text-mca-ink-muted">
              Participation grants clustered into buckets — no individual trails.
            </p>
          </div>
        </div>
      </section>
    </Panel>
  );
}
