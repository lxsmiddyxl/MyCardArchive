"use client";

import { isDevelopmentNodeEnv } from "@/lib/client/dev-client-perf-gate";
import { mcaLog } from "@/lib/logging/mca-log-client";

const PERF_CTX = {
  componentName: "DevClientPerf",
  surfaceName: "perf",
} as const;

export function isClientDevProfiling(): boolean {
  return isDevelopmentNodeEnv();
}

/** Dev-only: log wall-clock for a collection-list style fetch (no bodies, no PII). */
export function logClientCollectionFetchTiming(
  label: string,
  url: string,
  startedMs: number,
  ok: boolean,
  status?: number
): void {
  if (!isClientDevProfiling()) return;
  const ms = Math.round(performance.now() - startedMs);
  mcaLog.timing(
    "perf.collection_fetch",
    { label, url, ms, ok, status: status ?? null },
    PERF_CTX
  );
}
