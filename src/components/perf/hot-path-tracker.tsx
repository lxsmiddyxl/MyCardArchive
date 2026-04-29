"use client";

import type { HotPathId } from "@/lib/perf/hot-path-ids";
import { postHotPathSamples } from "@/lib/perf/hot-paths-client";
import { useEffect } from "react";

/**
 * Records a single client-side duration sample (double rAF after mount) for above-the-fold / viewport work.
 */
export function HotPathTracker({ pathId }: { pathId: HotPathId }) {
  useEffect(() => {
    const t0 = performance.now();
    let raf1 = 0;
    const id = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(() => {
        const durationMs = performance.now() - t0;
        void postHotPathSamples([{ id: pathId, durationMs }]);
      });
    });
    return () => {
      cancelAnimationFrame(id);
      if (raf1) cancelAnimationFrame(raf1);
    };
  }, [pathId]);

  return null;
}
