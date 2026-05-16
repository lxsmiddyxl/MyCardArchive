"use client";

import { MCA_ANALYTICS_EVENTS } from "@/mca-utils/analytics/events";
import { trackMcaEvent } from "@/mca-utils/analytics/track";
import { redactPathForAnalytics, surfaceFromPath } from "@/lib/analytics/privacy-path";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type AnalyticsContextValue = {
  track: typeof trackMcaEvent;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function useMcaAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    return { track: trackMcaEvent };
  }
  return ctx;
}

/**
 * Launch Prep Phase 3 — pageview + funnel hooks for marketing, binders, embeds.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const track = useCallback(trackMcaEvent, []);

  const value = useMemo(() => ({ track }), [track]);

  useEffect(() => {
    const redacted = redactPathForAnalytics(pathname);
    if (lastPath.current === redacted) return;
    lastPath.current = redacted;

    const surface = surfaceFromPath(pathname);
    track(MCA_ANALYTICS_EVENTS.page_view, { path: redacted, surface });

    if (pathname.startsWith("/embed/")) {
      track(MCA_ANALYTICS_EVENTS.embed_view, { path: redacted });
    } else if (pathname.startsWith("/b/")) {
      track(MCA_ANALYTICS_EVENTS.public_binder_view, { path: redacted });
    } else if (pathname.startsWith("/profile/")) {
      track(MCA_ANALYTICS_EVENTS.profile_view, { path: redacted });
    }
  }, [pathname, track]);

  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}
