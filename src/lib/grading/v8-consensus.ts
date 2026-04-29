import type { GradingPayload } from "@/lib/grading/types";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
}

function consensus01(vals: number[]): number {
  if (vals.length < 2) return 1;
  const v = variance(vals);
  return Math.max(0, Math.min(1, 1 - Math.min(1, v / 120)));
}

function bandFromConsensus(c: number): "tight" | "medium" | "loose" {
  if (c >= 0.82) return "tight";
  if (c >= 0.55) return "medium";
  return "loose";
}

/**
 * Phase 83 — Cross-head overall consensus + subgrade tightness as per-dimension proxy.
 */
export async function attachGradingConsensusV8(
  supabase: SupabaseClient<Database>,
  cardId: string,
  grade: GradingPayload
): Promise<void> {
  const { data: cardRuns } = await supabase
    .from("card_grading_runs")
    .select("overall, model_version, pipeline_version, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(20);

  const runs = cardRuns ?? [];
  const seen = new Set<string>();
  const distinct: typeof runs = [];
  for (const r of runs) {
    const k = `${r.pipeline_version ?? ""}:${r.model_version ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    distinct.push(r);
    if (distinct.length >= 5) break;
  }

  const overalls = distinct
    .map((r) => (r.overall != null ? Number(r.overall) : null))
    .filter((x): x is number => x != null && !Number.isNaN(x));

  const headsConsensus = overalls.length >= 2 ? consensus01(overalls) : 1;

  const sub = grade.summary.subgrades;
  const subs = [sub.centering, sub.corners, sub.edges, sub.surface].filter(
    (x): x is number => typeof x === "number" && !Number.isNaN(x)
  );
  const internalTightness = subs.length >= 2 ? consensus01(subs) : 0.75;
  const meanSub = subs.length > 0 ? subs.reduce((a, b) => a + b, 0) / subs.length : 0;

  const dimScore = (x: number | null) => {
    if (x == null || Number.isNaN(x)) return headsConsensus;
    return Math.max(0, Math.min(1, headsConsensus * (1 - Math.min(1, Math.abs(x - meanSub) / 22))));
  };

  const perDimension = {
    centering: dimScore(sub.centering),
    corners: dimScore(sub.corners),
    edges: dimScore(sub.edges),
    surface: dimScore(sub.surface),
  };

  const blended =
    distinct.length >= 2 ? 0.62 * headsConsensus + 0.38 * internalTightness : internalTightness;
  const score = Math.max(0, Math.min(1, blended));
  const band = bandFromConsensus(score);

  grade.summary = {
    ...grade.summary,
    gradingConsensus: {
      score,
      band,
      headsCompared: distinct.length,
      crossHeadAgreement: headsConsensus,
      subgradeTightness: internalTightness,
      perDimension,
    },
    gradingConfidenceBand: {
      band,
      label: band === "tight" ? "Tight band" : band === "medium" ? "Medium band" : "Loose band",
    },
  };
}
