"use client";

import { redactPathForAnalytics, surfaceFromPath } from "@/lib/analytics/privacy-path";
import { trackProductClientEvent } from "@/lib/analytics/track-product-client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MAJOR = new Set([
  "/",
  "/welcome",
  "/binders",
  "/decks",
  "/trades",
  "/feed",
  "/community",
  "/market",
  "/profile",
  "/search",
  "/catalog",
  "/achievements",
  "/notifications",
]);

function isMajorSurface(redacted: string): boolean {
  if (MAJOR.has(redacted)) return true;
  const root = redacted.split("/").filter(Boolean)[0] ?? "";
  return (
    root === "binders" ||
    root === "decks" ||
    root === "trades" ||
    root === "profile" ||
    root === "clubs" ||
    root === "showcase"
  );
}

/**
 * Emits privacy-bucketed pageviews for major surfaces (Phase 61).
 */
export function ProductPageviewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const redacted = redactPathForAnalytics(pathname);
    if (!isMajorSurface(redacted)) return;
    if (last.current === redacted) return;
    last.current = redacted;
    trackProductClientEvent("pageview", {
      path: redacted,
      surface: surfaceFromPath(redacted),
    });
  }, [pathname]);

  return null;
}
