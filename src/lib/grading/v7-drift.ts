import type { GradingPayload } from "@/lib/grading/types";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DriftJson = {
  sampleSize?: number;
  slopePerDay?: number;
  expectedShift7d?: number;
  intercept?: number;
  series?: { epoch?: number; overall?: number; at?: string }[];
  error?: string;
};

/**
 * Phase 78 — Temporal drift estimate + optional recalibration hint (RPC-backed).
 */
export async function attachGradingTemporalDriftV7(
  supabase: SupabaseClient<Database>,
  userId: string,
  grade: GradingPayload,
  logDrift?: (payload: Record<string, unknown>) => void
): Promise<void> {
  const { data, error } = await supabase.rpc("grading_compute_temporal_drift", {
    p_user_id: userId,
  });

  if (error || data == null || (typeof data === "object" && data !== null && "error" in data)) {
    return;
  }

  const j = data as unknown as DriftJson;
  if (j.error) return;

  const shift = typeof j.expectedShift7d === "number" ? j.expectedShift7d : Number(j.expectedShift7d ?? 0);
  const sample = typeof j.sampleSize === "number" ? j.sampleSize : 0;

  const series = Array.isArray(j.series)
    ? j.series.map((p) => ({
        epoch: typeof p.epoch === "number" ? p.epoch : 0,
        overall: typeof p.overall === "number" ? p.overall : Number(p.overall ?? 0),
        at: typeof p.at === "string" ? p.at : null,
      }))
    : [];

  grade.summary = {
    ...grade.summary,
    gradingTemporalDrift: {
      sampleSize: sample,
      slopePerDay: typeof j.slopePerDay === "number" ? j.slopePerDay : Number(j.slopePerDay ?? 0),
      expectedShift7d: shift,
      intercept: typeof j.intercept === "number" ? j.intercept : Number(j.intercept ?? 0),
      series,
    },
  };

  if (sample >= 3 && Math.abs(shift) >= 1.25) {
    const suggested = Math.max(-8, Math.min(8, -shift * 0.22));
    grade.summary = {
      ...grade.summary,
      gradingRecalibration: {
        suggestedOffsetDelta: Math.round(suggested * 100) / 100,
        reason:
          shift > 0
            ? "Recent grades trend upward; consider a small negative calibration nudge if reviews disagree."
            : "Recent grades trend downward; consider a small positive calibration nudge if reviews disagree.",
      },
    };
  }

  logDrift?.({
    sampleSize: sample,
    expectedShift7d: shift,
    slopePerDay: grade.summary.gradingTemporalDrift?.slopePerDay,
  });
}
