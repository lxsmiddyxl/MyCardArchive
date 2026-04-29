"use client";

import type { HotPathId } from "@/lib/perf/hot-path-ids";

export async function postHotPathSamples(samples: Array<{ id: HotPathId; durationMs: number }>): Promise<void> {
  if (process.env.NEXT_PUBLIC_STABILITY_MODE !== "1") return;
  if (samples.length === 0) return;
  try {
    await fetch("/api/internal/perf/hot-paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
