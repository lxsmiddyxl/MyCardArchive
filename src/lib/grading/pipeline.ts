import { GRADING_PIPELINE_VERSION, HEURISTIC_FALLBACK_VERSION } from "@/lib/grading/constants";
import { buildGradingRequestEnvelope } from "@/lib/grading/envelope";
import { buildHeuristicGradingPayload } from "@/lib/grading/heuristic";
import { buildModelInputFromEnvelope } from "@/lib/grading/model-input-builder";
import { validateModelOutput } from "@/lib/grading/model-output-validator";
import type { NormalizeInput } from "@/lib/grading/types";
import type { GradingPayload } from "@/lib/grading/types";

export type GradingPipelineResult = {
  grade: GradingPayload;
  /** Where inference came from. */
  source: "model" | "heuristic";
  /** Reason when source is heuristic after attempting model. */
  fallbackReason?: string;
};

function getModelEndpoint(): string | null {
  const u =
    process.env.MCA_GRADING_MODEL_URL?.trim() ||
    process.env.GRADING_MODEL_URL?.trim() ||
    "";
  return u.length > 0 ? u : null;
}

const MODEL_TIMEOUT_MS = 25_000;

/**
 * Runs model-ready grading: optional HTTP inference, strict validation, then heuristic fallback.
 * Server-only network path; safe to call from API routes.
 */
export async function runGradingPipeline(
  cardId: string,
  normalized: NormalizeInput,
  log?: {
    onStart: () => void;
    onSuccess: () => void;
    onFailure: (reason: string) => void;
  }
): Promise<GradingPipelineResult> {
  const envelope = buildGradingRequestEnvelope(cardId, normalized);
  const modelInput = buildModelInputFromEnvelope(envelope);
  const endpoint = getModelEndpoint();

  if (!endpoint || envelope.requestedModel === "heuristic_only") {
    const grade = buildHeuristicGradingPayload(cardId, normalized);
    grade.summary = {
      ...grade.summary,
      pipelineVersion: GRADING_PIPELINE_VERSION,
    };
    return {
      grade,
      source: "heuristic",
      fallbackReason: !endpoint ? "model_endpoint_unconfigured" : "heuristic_only_requested",
    };
  }

  log?.onStart();

  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), MODEL_TIMEOUT_MS);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelInput),
      signal: ac.signal,
    });
    clearTimeout(t);

    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = `model_http_${res.status}`;
      log?.onFailure(reason);
      const grade = buildHeuristicGradingPayload(cardId, normalized);
      grade.summary = { ...grade.summary, pipelineVersion: GRADING_PIPELINE_VERSION };
      return { grade, source: "heuristic", fallbackReason: reason };
    }

    const modelVersion =
      raw &&
      typeof raw === "object" &&
      "modelVersion" in raw &&
      typeof (raw as { modelVersion?: unknown }).modelVersion === "string"
        ? (raw as { modelVersion: string }).modelVersion
        : "remote-model";

    const validated = validateModelOutput(raw, cardId, modelVersion);
    if (!validated) {
      const reason = "model_output_invalid";
      log?.onFailure(reason);
      const grade = buildHeuristicGradingPayload(cardId, normalized);
      grade.summary = { ...grade.summary, pipelineVersion: GRADING_PIPELINE_VERSION };
      return { grade, source: "heuristic", fallbackReason: reason };
    }

    validated.summary = {
      ...validated.summary,
      pipelineVersion: GRADING_PIPELINE_VERSION,
      modelVersion: validated.summary.modelVersion ?? modelVersion,
    };
    log?.onSuccess();
    return { grade: validated, source: "model" };
  } catch (e) {
    const reason =
      e instanceof Error ? (e.name === "AbortError" ? "model_timeout" : e.message) : "model_fetch_error";
    log?.onFailure(reason);
    const grade = buildHeuristicGradingPayload(cardId, normalized);
    grade.summary = { ...grade.summary, pipelineVersion: GRADING_PIPELINE_VERSION };
    return { grade, source: "heuristic", fallbackReason: reason };
  }
}

export { HEURISTIC_FALLBACK_VERSION, GRADING_PIPELINE_VERSION };
