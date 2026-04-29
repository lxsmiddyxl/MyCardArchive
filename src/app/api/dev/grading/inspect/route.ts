import {
  buildGradingRequestEnvelope,
  buildHeuristicGradingPayload,
  buildModelInputFromEnvelope,
  GRADING_PIPELINE_VERSION,
  normalizeGradingInput,
} from "@/lib/grading";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Dev-only: exposes pipeline shape (no card secrets). Do not enable in production builds.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sampleCardId = "00000000-0000-4000-8000-000000000000";
  const normalized = normalizeGradingInput({ cardId: sampleCardId });
  const envelope = buildGradingRequestEnvelope(sampleCardId, normalized);
  const modelInput = buildModelInputFromEnvelope(envelope);
  const heuristic = buildHeuristicGradingPayload(sampleCardId, normalized);

  const modelUrlConfigured = Boolean(
    process.env.MCA_GRADING_MODEL_URL?.trim() || process.env.GRADING_MODEL_URL?.trim()
  );

  return NextResponse.json({
    pipelineVersion: GRADING_PIPELINE_VERSION,
    modelUrlConfigured,
    envelope,
    modelInput,
    heuristicSummary: heuristic.summary,
  });
}
