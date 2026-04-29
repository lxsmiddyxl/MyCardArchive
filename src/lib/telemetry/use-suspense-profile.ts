"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { useMcaContextRef } from "@/lib/telemetry/use-mca-context-ref";
import { useLayoutEffect } from "react";

/**
 * Call from the **resolved** branch inside a {@link React.Suspense} boundary.
 * Pair with {@link SuspenseFallbackMarker} in the `fallback` UI (same `name`).
 */
export function useSuspenseProfile(name: string, ctx: McaLogContext) {
  const ctxRef = useMcaContextRef(ctx);
  useLayoutEffect(() => {
    const measureName = `mca-suspense-${name}`;
    const startName = `${measureName}-start`;
    const endName = `${measureName}-end`;
    const wfName = `${measureName}-waterfall`;

    try {
      performance.mark(endName);
      if (performance.getEntriesByName(startName, "mark").length > 0) {
        performance.measure(wfName, startName, endName);
        const m = performance.getEntriesByName(wfName, "measure")[0];
        if (m) {
          const ms = Math.round(m.duration * 100) / 100;
          queueMicrotask(() =>
            mcaLog.timing(`suspense.${name}.waterfall`, { ms }, ctxRef.current)
          );
        }
      }
    } catch {
      /* Performance API may be unavailable */
    }
  }, [name, ctxRef]);
}
