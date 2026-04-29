import type { GradingPayload } from "@/lib/grading/types";
import type { Database } from "@/lib/supabase/types";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CROSS_WARN_THRESHOLD = 8;

/**
 * Cross-card consistency, multi-model run comparison, and per-user grading fingerprint (v5).
 */
export async function attachGradingV5Extras(
  supabase: SupabaseClient<Database>,
  cardId: string,
  userId: string,
  grade: GradingPayload,
  opts: { peerCardId?: string | null }
): Promise<void> {
  const summary = grade.summary;
  const overall = summary.overall;

  const { data: runs } = await supabase
    .from("card_grading_runs")
    .select("overall, model_version, model_label, pipeline_version, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(12);

  const runList = runs ?? [];
  const mapped = runList.map((r) => ({
    modelVersion: r.model_version,
    modelLabel: r.model_label,
    pipelineVersion: r.pipeline_version,
    overall: r.overall != null ? Number(r.overall) : null,
    createdAt: r.created_at,
  }));

  let nextSummary = { ...summary };

  if (mapped.length >= 2) {
    const [a, b] = mapped;
    if (
      a.overall != null &&
      b.overall != null &&
      a.modelVersion != null &&
      b.modelVersion != null &&
      a.modelVersion !== b.modelVersion
    ) {
      nextSummary = {
        ...nextSummary,
        gradingModelCompare: {
          delta: Math.abs(a.overall - b.overall),
          runs: mapped.slice(0, 4),
        },
      };
    }
  }

  let peerOverall: number | null = null;
  let peerCardId: string | null = opts.peerCardId?.trim() ?? null;
  if (peerCardId) {
    const { data: peerCard } = await supabase
      .from("cards")
      .select("id")
      .eq("id", peerCardId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!peerCard) {
      peerCardId = null;
    } else {
      const { data: peerRun } = await supabase
        .from("card_grading_runs")
        .select("overall")
        .eq("card_id", peerCardId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      peerOverall = peerRun?.overall != null ? Number(peerRun.overall) : null;
    }
  }

  const deltaOverall =
    peerOverall != null && overall != null ? Math.abs(peerOverall - Number(overall)) : null;
  const consistencyWarning =
    deltaOverall != null ? deltaOverall >= CROSS_WARN_THRESHOLD : false;

  if (peerCardId) {
    nextSummary = {
      ...nextSummary,
      gradingCrossCard: {
        peerCardId,
        peerOverall,
        deltaOverall,
        consistencyWarning,
      },
    };
  }

  const versions = Array.from(
    new Set(
      runList
        .map((r) => r.model_version)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    )
  ).sort();
  const fingerprint = createHash("sha256").update(versions.join("|")).digest("hex").slice(0, 16);

  if (versions.length > 0) {
    await supabase.from("grading_user_fingerprint").upsert(
      {
        user_id: userId,
        fingerprint,
        model_versions: versions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    nextSummary = {
      ...nextSummary,
      gradingFingerprint: { hash: fingerprint, modelVersions: versions },
    };
  }

  grade.summary = nextSummary;
}
