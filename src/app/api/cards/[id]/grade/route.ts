import {
  GRADING_PIPELINE_VERSION,
  HEURISTIC_FALLBACK_VERSION,
  normalizeGradingInput,
  runGradingPipeline,
} from "@/lib/grading";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { attachGradingConsistencyV4 } from "@/lib/grading/consistency";
import { attachGradingV5Extras } from "@/lib/grading/v5-extras";
import { attachGradingV6Extras } from "@/lib/grading/v6-extras";
import { attachGradingConsensusV8 } from "@/lib/grading/v8-consensus";
import { attachGradingTemporalDriftV7 } from "@/lib/grading/v7-drift";
import { isUuidString } from "@/lib/server/is-uuid";
import { logGradingModelV2Telemetry } from "@/lib/grading/grading-v2-telemetry";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

const LOG_CTX = { componentName: "api", surfaceName: "cards.grade" } as const;

async function assertCardOwner(
  supabase: ReturnType<typeof createClient>,
  cardId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

async function GET_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return errorJson(ctx, "Invalid card id", 400);
  }

  const ok = await assertCardOwner(supabase, cardId, userId);
  if (!ok) {
    return errorJson(ctx, "Card not found", 404);
  }

  const url = new URL(request.url);
  const peerQ = url.searchParams.get("peerCardId")?.trim() ?? "";
  const peerCardId = peerQ && isUuidString(peerQ) ? peerQ : null;

  const normalized = normalizeGradingInput({ cardId });
  const result = await runGradingPipeline(cardId, normalized, {
    onStart: () => {
      mcaLog.event("grading.model.start", { cardId, pipeline: GRADING_PIPELINE_VERSION }, { ...LOG_CTX, traceId: cardId });
    },
    onSuccess: () => {
      mcaLog.event("grading.model.success", { cardId, pipeline: GRADING_PIPELINE_VERSION }, { ...LOG_CTX, traceId: cardId });
    },
    onFailure: (reason) => {
      mcaLog.event(
        "grading.model.failure",
        { cardId, reason, pipeline: GRADING_PIPELINE_VERSION },
        { ...LOG_CTX, traceId: cardId }
      );
    },
  });

  mcaLog.event(
    "grading.pipeline.complete",
    {
      cardId,
      source: result.source,
      fallbackReason: result.fallbackReason,
      pipeline: GRADING_PIPELINE_VERSION,
    },
    { ...LOG_CTX, traceId: cardId }
  );

  logGradingModelV2Telemetry(result.grade, cardId);

  const infer: "heuristic" | "model" = result.source === "model" ? "model" : "heuristic";
  await attachGradingConsistencyV4(supabase, cardId, userId, result.grade, {
    persistRun: false,
    pipelineVersion: GRADING_PIPELINE_VERSION,
    inferenceSource: infer,
    peerCardId,
    modelLabel: result.grade.summary.modelVersion ?? null,
  });

  await attachGradingV5Extras(supabase, cardId, userId, result.grade, { peerCardId });
  await attachGradingV6Extras(supabase, cardId, userId, result.grade);
  await attachGradingTemporalDriftV7(supabase, userId, result.grade, (payload) => {
    mcaLog.event("grading.model.drift_model", { cardId, ...payload }, { ...LOG_CTX, traceId: cardId });
  });
  await attachGradingConsensusV8(supabase, cardId, result.grade);
  if (result.grade.summary.gradingConsensus) {
    mcaLog.event(
      "grading.model.consensus",
      {
        cardId,
        score: result.grade.summary.gradingConsensus.score,
        headsCompared: result.grade.summary.gradingConsensus.headsCompared,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingConfidenceBand) {
    mcaLog.event(
      "grading.model.confidence_band",
      {
        cardId,
        band: result.grade.summary.gradingConfidenceBand.band,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  if (result.grade.summary.gradingFusion) {
    mcaLog.event(
      "grading.model.fusion",
      {
        cardId,
        fusedOverall: result.grade.summary.gradingFusion.fusedOverall,
        heads: result.grade.summary.gradingFusion.heads,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingStability) {
    mcaLog.event(
      "grading.model.stability",
      {
        cardId,
        score: result.grade.summary.gradingStability.score,
        sampleSize: result.grade.summary.gradingStability.sampleSize,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  if (result.grade.summary.gradingModelCompare) {
    mcaLog.event(
      "grading.model.compare",
      {
        cardId,
        delta: result.grade.summary.gradingModelCompare.delta,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingCrossCard?.consistencyWarning) {
    mcaLog.event(
      "grading.model.consistency",
      {
        cardId,
        peerCardId: result.grade.summary.gradingCrossCard.peerCardId,
        deltaOverall: result.grade.summary.gradingCrossCard.deltaOverall,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  if (result.grade.summary.modelVersion) {
    mcaLog.event(
      "grading.model.version_used",
      {
        cardId,
        modelVersion: result.grade.summary.modelVersion,
        pipeline: GRADING_PIPELINE_VERSION,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingConsistency?.driftDetected) {
    mcaLog.event(
      "grading.model.drift_detected",
      {
        cardId,
        driftDelta: result.grade.summary.gradingConsistency.driftDelta,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  return successJson(ctx, {
    grade: result.grade,
    inference: { source: result.source, fallbackReason: result.fallbackReason },
  });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return errorJson(ctx, "Invalid card id", 400);
  }

  const ok = await assertCardOwner(supabase, cardId, userId);
  if (!ok) {
    return errorJson(ctx, "Card not found", 404);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const peerRaw =
    body && typeof body === "object" && "peerCardId" in body
      ? String((body as { peerCardId?: unknown }).peerCardId ?? "").trim()
      : "";
  const peerCardId = peerRaw && isUuidString(peerRaw) ? peerRaw : null;

  const normalized = normalizeGradingInput(body);
  const result = await runGradingPipeline(cardId, { ...normalized, cardId }, {
    onStart: () => {
      mcaLog.event("grading.model.start", { cardId, pipeline: GRADING_PIPELINE_VERSION }, { ...LOG_CTX, traceId: cardId });
    },
    onSuccess: () => {
      mcaLog.event("grading.model.success", { cardId, pipeline: GRADING_PIPELINE_VERSION }, { ...LOG_CTX, traceId: cardId });
    },
    onFailure: (reason) => {
      mcaLog.event(
        "grading.model.failure",
        { cardId, reason, pipeline: GRADING_PIPELINE_VERSION },
        { ...LOG_CTX, traceId: cardId }
      );
    },
  });

  mcaLog.event(
    "grading.pipeline.complete",
    {
      cardId,
      source: result.source,
      fallbackReason: result.fallbackReason,
      pipeline: GRADING_PIPELINE_VERSION,
    },
    { ...LOG_CTX, traceId: cardId }
  );

  logGradingModelV2Telemetry(result.grade, cardId);

  const infer: "heuristic" | "model" = result.source === "model" ? "model" : "heuristic";
  await attachGradingConsistencyV4(supabase, cardId, userId, result.grade, {
    persistRun: true,
    pipelineVersion: GRADING_PIPELINE_VERSION,
    inferenceSource: infer,
    peerCardId,
    modelLabel: result.grade.summary.modelVersion ?? null,
  });

  await attachGradingV5Extras(supabase, cardId, userId, result.grade, { peerCardId });
  await attachGradingV6Extras(supabase, cardId, userId, result.grade);
  await attachGradingTemporalDriftV7(supabase, userId, result.grade, (payload) => {
    mcaLog.event("grading.model.drift_model", { cardId, ...payload }, { ...LOG_CTX, traceId: cardId });
  });
  await attachGradingConsensusV8(supabase, cardId, result.grade);
  if (result.grade.summary.gradingConsensus) {
    mcaLog.event(
      "grading.model.consensus",
      {
        cardId,
        score: result.grade.summary.gradingConsensus.score,
        headsCompared: result.grade.summary.gradingConsensus.headsCompared,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingConfidenceBand) {
    mcaLog.event(
      "grading.model.confidence_band",
      {
        cardId,
        band: result.grade.summary.gradingConfidenceBand.band,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  if (result.grade.summary.gradingFusion) {
    mcaLog.event(
      "grading.model.fusion",
      {
        cardId,
        fusedOverall: result.grade.summary.gradingFusion.fusedOverall,
        heads: result.grade.summary.gradingFusion.heads,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingStability) {
    mcaLog.event(
      "grading.model.stability",
      {
        cardId,
        score: result.grade.summary.gradingStability.score,
        sampleSize: result.grade.summary.gradingStability.sampleSize,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  if (result.grade.summary.modelVersion) {
    mcaLog.event(
      "grading.model.version_used",
      {
        cardId,
        modelVersion: result.grade.summary.modelVersion,
        pipeline: GRADING_PIPELINE_VERSION,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingModelCompare) {
    mcaLog.event(
      "grading.model.compare",
      {
        cardId,
        delta: result.grade.summary.gradingModelCompare.delta,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingCrossCard?.consistencyWarning) {
    mcaLog.event(
      "grading.model.consistency",
      {
        cardId,
        peerCardId: result.grade.summary.gradingCrossCard.peerCardId,
        deltaOverall: result.grade.summary.gradingCrossCard.deltaOverall,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }
  if (result.grade.summary.gradingConsistency?.driftDetected) {
    mcaLog.event(
      "grading.model.drift_detected",
      {
        cardId,
        driftDelta: result.grade.summary.gradingConsistency.driftDelta,
      },
      { ...LOG_CTX, traceId: cardId }
    );
  }

  return successJson(ctx, {
    status: "completed",
    message:
      result.source === "model"
        ? "Model grading complete."
        : `Heuristic fallback (${HEURISTIC_FALLBACK_VERSION}) — configure MCA_GRADING_MODEL_URL for remote inference.`,
    grade: result.grade,
    inference: { source: result.source, fallbackReason: result.fallbackReason },
  });
}

export const GET = defineRoute("GET /api/cards/[id]/grade", GET_handler);
export const POST = defineRoute("POST /api/cards/[id]/grade", POST_handler);
