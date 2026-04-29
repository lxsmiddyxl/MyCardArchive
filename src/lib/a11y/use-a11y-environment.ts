"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { useEffect, useRef } from "react";

const TEL = { componentName: "A11yEnvironment", surfaceName: "a11y" } as const;

function readPrefs(): {
  reducedMotion: boolean | null;
  contrastMore: boolean | null;
  forcedColors: boolean | null;
} {
  if (typeof window === "undefined" || typeof matchMedia === "undefined") {
    return { reducedMotion: null, contrastMore: null, forcedColors: null };
  }
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    contrastMore: window.matchMedia("(prefers-contrast: more)").matches,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
  };
}

/**
 * One-shot telemetry for user environment (reduced motion / contrast / forced colors).
 * Does not persist PII — only boolean flags for analytics.
 */
export function useA11yEnvironmentTelemetry(): void {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const p = readPrefs();
    mcaLog.event(
      "a11y.environment",
      {
        reducedMotion: p.reducedMotion,
        contrastMore: p.contrastMore,
        forcedColors: p.forcedColors,
      },
      TEL
    );

    if (p.reducedMotion) {
      mcaLog.event("a11y.fallback.reduced_motion", {}, TEL);
    }
    if (p.contrastMore || p.forcedColors) {
      mcaLog.event("a11y.fallback.high_contrast", { contrastMore: p.contrastMore, forcedColors: p.forcedColors }, TEL);
    }
  }, []);
}
