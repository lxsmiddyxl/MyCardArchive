"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useRef, useState } from "react";

const DEFAULT_CTX = { componentName: "SafeModeGate", surfaceName: "app" } as const;

export type SafeModeGateOptions = {
  surfaceName: string;
  /** Consecutive failed loads before safe mode (default 3). */
  maxFailures?: number;
};

/**
 * Counts consecutive load failures; after {@link maxFailures}, enters “safe mode” for a degraded UI.
 * Successful loads reset the counter.
 */
export function useSafeModeGate({ surfaceName, maxFailures = 3 }: SafeModeGateOptions) {
  const [safeMode, setSafeMode] = useState(false);
  const failures = useRef(0);

  const onLoadSuccess = useCallback(() => {
    failures.current = 0;
    setSafeMode((prev) => {
      if (prev) {
        mcaLog.event(
          "surface.safe_mode.exit",
          { surfaceName, reason: "load_success" },
          { ...DEFAULT_CTX, surfaceName }
        );
      }
      return false;
    });
  }, [surfaceName]);

  const onLoadFailure = useCallback(
    (detail?: { message?: string }) => {
      failures.current += 1;
      const n = failures.current;
      mcaLog.warn(
        "surface.load.failure",
        { surfaceName, attempt: n, message: detail?.message ?? null },
        { ...DEFAULT_CTX, surfaceName }
      );
      if (n >= maxFailures) {
        setSafeMode(true);
        mcaLog.event(
          "surface.safe_mode.enter",
          { surfaceName, failures: n },
          { ...DEFAULT_CTX, surfaceName }
        );
      }
    },
    [surfaceName, maxFailures]
  );

  const leaveSafeMode = useCallback(() => {
    failures.current = 0;
    setSafeMode(false);
    mcaLog.event(
      "surface.safe_mode.exit",
      { surfaceName, reason: "user_dismiss" },
      { ...DEFAULT_CTX, surfaceName }
    );
  }, [surfaceName]);

  return { safeMode, onLoadSuccess, onLoadFailure, leaveSafeMode };
}
