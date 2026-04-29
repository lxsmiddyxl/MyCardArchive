"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { useMcaContextRef } from "@/lib/telemetry/use-mca-context-ref";
import { useLayoutEffect } from "react";

/**
 * Logs time span between commits when `itemCount` changes (list churn proxy).
 */
export function useListRenderStats(
  name: string,
  itemCount: number,
  ctx: McaLogContext
) {
  const ctxRef = useMcaContextRef(ctx);
  useLayoutEffect(() => {
    const t0 = performance.now();
    const ctxSnapshot = ctxRef.current;
    const itemCountSnapshot = itemCount;
    return () => {
      const ms = performance.now() - t0;
      queueMicrotask(() =>
        mcaLog.timing(
          `list.${name}.span`,
          { ms, itemCount: itemCountSnapshot },
          ctxSnapshot
        )
      );
    };
  }, [itemCount, name, ctxRef]);
}
