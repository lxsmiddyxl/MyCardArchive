"use client";

import {
  getRealtimeBannerPhase,
  getServerRealtimeBannerPhase,
  subscribeRealtimeBanner,
} from "@/lib/realtime/realtime-status-store";
import type { RealtimeBannerPhase } from "@/lib/realtime/realtime-status-store";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { cn } from "@/lib/ui/cn";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSyncExternalStore } from "react";

const RT_CTX = {
  componentName: "RealtimeStatusBanner",
  surfaceName: "realtime",
} as const;

const COPY: Record<Exclude<RealtimeBannerPhase, "hidden">, string> = {
  retrying: "Realtime connection lost — retrying…",
  reconnected: "Reconnected",
  exhausted: "Realtime unavailable — refresh the page or try again shortly.",
};

/**
 * Fixed toast-style strip for mux/presence health. Does not affect document flow (no layout shift).
 */
export function RealtimeStatusBanner() {
  const router = useRouter();
  const phase = useSyncExternalStore(
    subscribeRealtimeBanner,
    getRealtimeBannerPhase,
    getServerRealtimeBannerPhase
  );

  useEffect(() => {
    if (phase === "hidden") return;
    if (phase === "retrying") {
      mcaLog.warn("realtime.banner.phase", { phase: "retrying" }, RT_CTX);
      return;
    }
    if (phase === "exhausted") {
      mcaLog.warn("realtime.banner.phase", { phase: "exhausted" }, RT_CTX);
      return;
    }
    if (phase === "reconnected") {
      mcaLog.event("realtime.banner.phase", { phase: "reconnected" }, RT_CTX);
    }
  }, [phase]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-14 z-[55] flex justify-center px-mca-base pt-mca-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-lg flex-col gap-mca-sm rounded-mca-block border px-mca-md py-mca-sm text-mca-caption shadow-mca-card transition-opacity duration-200 ease-mca-standard",
          phase === "retrying" && "border-mca-accent-strong/40 bg-mca-accent-strong/10 text-mca-warning-tint",
          phase === "reconnected" && "border-mca-focus/40 bg-mca-success-bold/10 text-mca-success-tint",
          phase === "exhausted" &&
            "border-mca-error-bright/35 bg-mca-error-surface/50 text-mca-error-text-strong"
        )}
      >
        <span>{COPY[phase]}</span>
        {phase === "exhausted" ? (
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/90 px-mca-sm py-mca-xs text-mca-caption font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
          >
            Refresh page
          </button>
        ) : null}
      </div>
    </div>
  );
}
