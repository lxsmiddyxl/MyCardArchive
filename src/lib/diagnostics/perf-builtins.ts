import "server-only";

import { getCacheStats } from "@/lib/cache/cache-store";
import { registerDiagnostic } from "@/lib/diagnostics/registry";
import { evaluateLatencyBudget, getLatencyBudget } from "@/lib/perf/latency-budgets";
import { HOT_PATH_IDS, type HotPathId } from "@/lib/perf/hot-path-ids";
import { getHotPathStats } from "@/lib/perf/hot-paths";

async function hotPathLatencyCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const stats = getHotPathStats();
  const byId = new Map(stats.map((s) => [s.id, s]));
  const evaluations: Array<{
    id: HotPathId;
    budget: number;
    p95: number;
    ok: boolean;
    overBudgetByMs: number;
    samples: number;
  }> = [];

  let anyOver = false;
  for (const id of HOT_PATH_IDS) {
    const s = byId.get(id);
    const budget = getLatencyBudget(id);
    if (!s) {
      evaluations.push({
        id,
        budget,
        p95: 0,
        ok: true,
        overBudgetByMs: 0,
        samples: 0,
      });
      continue;
    }
    const ev = evaluateLatencyBudget(id, s);
    if (!ev.ok) anyOver = true;
    evaluations.push({
      id,
      budget,
      p95: s.p95,
      ok: ev.ok,
      overBudgetByMs: ev.overBudgetByMs,
      samples: s.samples,
    });
  }

  return {
    ok: !anyOver,
    data: {
      hotPaths: evaluations,
    },
  };
}

async function cacheHealthCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const s = getCacheStats();
  const ratio = s.hits + s.misses > 0 ? s.hits / (s.hits + s.misses) : 1;
  return {
    ok: true,
    data: {
      cache: {
        hits: s.hits,
        misses: s.misses,
        evictions: s.evictions,
        size: s.size,
        hitRatio: Math.round(ratio * 1000) / 1000,
      },
    },
  };
}

registerDiagnostic("hotPathLatencyCheck", hotPathLatencyCheck);
registerDiagnostic("cacheHealthCheck", cacheHealthCheck);
