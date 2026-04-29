"use client";

import { useLayoutEffect } from "react";

/**
 * Place inside a Suspense `fallback` tree. Pairs with {@link useSuspenseProfile} in the async child.
 */
export function SuspenseFallbackMarker({ name }: { name: string }) {
  useLayoutEffect(() => {
    try {
      performance.mark(`mca-suspense-${name}-start`);
    } catch {
      /* ignore */
    }
  }, [name]);
  return null;
}
