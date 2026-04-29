"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { useMcaContextRef } from "@/lib/telemetry/use-mca-context-ref";
import { useCallback, useMemo, useRef } from "react";

/**
 * Measures elapsed time between {@link start} and {@link end} (e.g. pointer → handler).
 * Non-blocking: emits via {@link mcaLog.timing} in a microtask.
 */
export function useInteractionTiming(name: string, ctx: McaLogContext) {
  const t0 = useRef<number | null>(null);
  const ctxRef = useMcaContextRef(ctx);

  const start = useCallback(() => {
    t0.current = performance.now();
  }, []);

  const end = useCallback(
    (extra?: Record<string, unknown>) => {
      if (t0.current == null) return;
      const ms = performance.now() - t0.current;
      t0.current = null;
      queueMicrotask(() =>
        mcaLog.timing(
          `ui.${name}.interaction`,
          { ms, ...(extra ?? {}) },
          ctxRef.current
        )
      );
    },
    [name, ctxRef]
  );

  const cancel = useCallback(() => {
    t0.current = null;
  }, []);

  return useMemo(
    () => ({ start, end, cancel }),
    [start, end, cancel]
  );
}
