"use client";

import { useSyncExternalStore } from "react";

/**
 * Raises TanStack Virtual overscan on narrow viewports so fast flick-scroll keeps fewer blanks.
 * SSR/CSR-safe — server snapshot matches desktop overscan.
 */
export function useMobileVirtualOverscan(baseOverscan: number): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
        ? Math.max(baseOverscan, 12)
        : baseOverscan,
    () => baseOverscan
  );
}
