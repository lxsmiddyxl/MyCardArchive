import type { GradingPayload } from "@/lib/grading/types";
import type { Database, Json } from "@/lib/supabase/types";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const WEIGHTS = [0.45, 0.33, 0.22];

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
}

/**
 * Cross-user calibration, model fusion (v3–v5 heads), stability score (v6).
 */
export async function attachGradingV6Extras(
  supabase: SupabaseClient<Database>,
  cardId: string,
  userId: string,
  grade: GradingPayload
): Promise<void> {
  const summary = grade.summary;

  const { data: cardRuns } = await supabase
    .from("card_grading_runs")
    .select("overall, model_version, pipeline_version, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(12);

  const runs = cardRuns ?? [];
  const overvals = runs
    .map((r) => (r.overall != null ? Number(r.overall) : null))
    .filter((x): x is number => x != null && !Number.isNaN(x));

  const stabVar = variance(overvals);
  const stabilityScore = Math.max(0, Math.min(1, 1 - Math.min(1, stabVar / 80)));

  const { data: userRuns } = await supabase
    .from("card_grading_runs")
    .select("overall")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const userOveralls = (userRuns ?? [])
    .map((r) => (r.overall != null ? Number(r.overall) : null))
    .filter((x): x is number => x != null && !Number.isNaN(x));
  const userAvg =
    userOveralls.length > 0 ? userOveralls.reduce((a, b) => a + b, 0) / userOveralls.length : null;

  const { data: cohortAvgRaw } = await supabase.rpc("get_grading_cohort_avg_overall");
  const cohortAvg =
    cohortAvgRaw == null
      ? null
      : typeof cohortAvgRaw === "number"
        ? cohortAvgRaw
        : Number(cohortAvgRaw);

  let calibrationOffset = 0;
  if (userAvg != null && cohortAvg != null && !Number.isNaN(Number(cohortAvg))) {
    calibrationOffset = Math.max(-18, Math.min(18, Number(cohortAvg) - userAvg));
  }

  const seen = new Set<string>();
  const distinctHeads: (typeof runs)[number][] = [];
  for (const r of runs) {
    const k = `${r.pipeline_version ?? ""}:${r.model_version ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    distinctHeads.push(r);
    if (distinctHeads.length >= 3) break;
  }

  let fusedOverall: number | null = null;
  if (distinctHeads.length > 0) {
    const nums = distinctHeads
      .map((r) => (r.overall != null ? Number(r.overall) : null))
      .filter((x): x is number => x != null && !Number.isNaN(x));
    if (nums.length > 0) {
      const w = WEIGHTS.slice(0, nums.length);
      const sumW = w.reduce((a, b) => a + b, 0);
      fusedOverall = nums.reduce((acc, x, i) => acc + x * (w[i] ?? 0), 0) / sumW;
    }
  }

  const fusionMeta = {
    heads: distinctHeads.map((r) => ({
      pipelineVersion: r.pipeline_version,
      modelVersion: r.model_version,
      overall: r.overall != null ? Number(r.overall) : null,
    })),
    fusedOverall,
    fusedAt: new Date().toISOString(),
  };

  const fpHash =
    summary.gradingFingerprint?.hash ??
    createHash("sha256")
      .update((summary.modelVersion ?? "heuristic") + "|v6")
      .digest("hex")
      .slice(0, 16);

  const modelVersions = summary.gradingFingerprint?.modelVersions?.length
    ? summary.gradingFingerprint.modelVersions
    : Array.from(
        new Set(runs.map((r) => r.model_version).filter((v): v is string => typeof v === "string" && v.length > 0))
      );

  await supabase.from("grading_user_fingerprint").upsert(
    {
      user_id: userId,
      fingerprint: fpHash,
      model_versions: modelVersions.length ? modelVersions : ["v6"],
      stability_score: stabilityScore,
      calibration_offset: calibrationOffset,
      fusion_meta: fusionMeta as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  let nextSummary = { ...summary };

  if (fusedOverall != null && summary.overall != null) {
    nextSummary = {
      ...nextSummary,
      gradingFusion: {
        fusedOverall,
        heads: distinctHeads.length,
        sources: distinctHeads.map((r) => r.pipeline_version ?? r.model_version ?? "run"),
      },
    };
  }

  nextSummary = {
    ...nextSummary,
    gradingStability: {
      score: stabilityScore,
      variance: stabVar,
      sampleSize: overvals.length,
    },
    gradingCalibration: {
      offset: calibrationOffset,
      userAvg,
      cohortAvg: cohortAvg != null && !Number.isNaN(Number(cohortAvg)) ? Number(cohortAvg) : null,
    },
  };

  grade.summary = nextSummary;
}
