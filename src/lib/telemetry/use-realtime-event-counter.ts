"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { useCallback, useEffect, useRef } from "react";

const FLUSH_MS = 2500;

/**
 * Batches realtime-related events and emits `realtime.{name}.throughput` (non-blocking).
 */
export function useRealtimeEventCounter(name: string, ctx: McaLogContext) {
  const pending = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>();
  const nameRef = useRef(name);
  nameRef.current = name;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const flush = useCallback(() => {
    const n = pending.current;
    pending.current = 0;
    if (n > 0) {
      const nm = nameRef.current;
      const c = ctxRef.current;
      queueMicrotask(() =>
        mcaLog.event(`realtime.${nm}.throughput`, { count: n }, c)
      );
    }
  }, []);

  const increment = useCallback(
    (delta = 1) => {
      pending.current += delta;
      clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush]
  );

  useEffect(
    () => () => {
      clearTimeout(flushTimer.current);
      flush();
    },
    [flush]
  );

  return increment;
}
