import type { HotPathId } from "@/lib/perf/hot-path-ids";

/** Minimal stats shape for budget evaluation (keeps this module free of server-only perf stores). */
export type LatencyBudgetStats = { p95: number; samples: number };

export const LATENCY_BUDGETS_MS: Record<HotPathId, number> = {
  "hp:home:aboveTheFold": 1000,
  "hp:collection:listViewport": 800,
  "hp:trade:detail": 900,
  "hp:activity:feed": 900,
  "hp:notifications:list": 800,
  "hp:search:cards": 1200,
};

export function getLatencyBudget(id: HotPathId): number {
  return LATENCY_BUDGETS_MS[id] ?? 1500;
}

export function evaluateLatencyBudget(
  id: HotPathId,
  stats: LatencyBudgetStats
): { ok: boolean; overBudgetByMs: number } {
  const budget = getLatencyBudget(id);
  if (stats.samples === 0) {
    return { ok: true, overBudgetByMs: 0 };
  }
  const over = stats.p95 - budget;
  return { ok: over <= 0, overBudgetByMs: over > 0 ? Math.round(over * 100) / 100 : 0 };
}
