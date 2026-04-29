import type { GradingPayload } from "@/lib/grading/types";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Points on overall scale — heuristic/model blend. */
export const GRADING_DRIFT_THRESHOLD = 5;

export async function attachGradingConsistencyV4(
  supabase: SupabaseClient<Database>,
  cardId: string,
  userId: string,
  grade: GradingPayload,
  opts: {
    persistRun: boolean;
    pipelineVersion: string;
    inferenceSource: "heuristic" | "model";
    /** v5: optional peer card for persisted cross-card snapshot */
    peerCardId?: string | null;
    modelLabel?: string | null;
  }
): Promise<void> {
  const summary = grade.summary;
  const overall = summary.overall;

  const { data: last } = await supabase
    .from("card_grading_runs")
    .select("overall")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousOverall = last?.overall != null ? Number(last.overall) : null;

  if (opts.persistRun) {
    await supabase.from("card_grading_runs").insert({
      card_id: cardId,
      user_id: userId,
      overall: overall ?? null,
      model_version: summary.modelVersion,
      pipeline_version: summary.pipelineVersion ?? opts.pipelineVersion,
      inference_source: opts.inferenceSource,
      model_label: opts.modelLabel ?? summary.modelVersion ?? null,
      peer_card_id: opts.peerCardId ?? null,
    });
  }

  const driftDelta =
    previousOverall != null && overall != null
      ? Math.abs(previousOverall - Number(overall))
      : null;
  const driftDetected =
    driftDelta != null ? driftDelta >= GRADING_DRIFT_THRESHOLD : false;

  grade.summary = {
    ...summary,
    gradingConsistency: {
      previousOverall,
      driftDelta,
      driftDetected,
    },
  };
}
