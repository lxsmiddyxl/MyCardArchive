"use client";

import { createMcaLog } from "@/lib/logging/mca-log-factory";
import type { McaLogEnvelope } from "@/lib/logging/types";

declare global {
  interface Window {
    __MCA_TELEMETRY__?: McaLogEnvelope[];
  }
}

function pushClient(env: McaLogEnvelope): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[MCA]", JSON.stringify(env));
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const w = window;
    w.__MCA_TELEMETRY__ ??= [];
    w.__MCA_TELEMETRY__.push(env);
    if (w.__MCA_TELEMETRY__.length > 80) w.__MCA_TELEMETRY__.shift();
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    queueMicrotask(() => {
      void fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(env),
        keepalive: true,
      }).catch(() => {});
    });
  }
}

/** Client + shared-component observability logger (Phase 46). */
export const mcaLog = createMcaLog(pushClient);
