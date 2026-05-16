import { errorJson, validateMultipart, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logServerError } from "@/lib/server/observability";
import type { ScanMatchResult } from "@/lib/dto/catalog";
import { fuseVisionWithCatalog } from "@/lib/scanning/v2/hybrid-fusion";
import { inferCardWithOpenAiVision } from "@/lib/scanning/v2/openai-vision-infer";
import { scanV2CapabilitiesPayload } from "@/lib/scanning/v2/capabilities";
import {
  matchExtractedToCatalog,
  normalizedCardFromExtracted,
} from "@/lib/scanning/v1/match-catalog";
import { parseCardFromOcrText } from "@/lib/scanning/v1/parse-text";
import { runCardOcr } from "@/lib/scanning/v1/ocr";
import type { ScanV25PersistedPayload, ScanV2PersistedPayload } from "@/lib/scanning/types";
import { runV25VisualIntel } from "@/lib/scanning/v2_5/visual-intelligence";
import { bufferToGray } from "@/lib/scanning/phase3/to-gray";
import { runNumberOcrFallback } from "@/lib/scanning/phase3/number-ocr-fallback";
import { rankScanCandidates, rankingToAutoMatch } from "@/lib/scanning/phase3/rank-candidates";
import { historyImageFromRanking, insertScanHistory } from "@/lib/scanning/phase3/scan-history";
import type { NumberOcrPass } from "@/mca-utils/scan/numberFallback";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanCreateScan,
  getScanCountThisMonth,
  getUserTier,
  isTierLimitError,
  isUnlimitedScans,
} from "@/lib/tier/check-limits";
import { validateScanMultipartForTier } from "@/lib/tier/scan-tier-policy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const maxDuration = 90;

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function jsonSafeAutoMatch(result: ScanMatchResult): ScanMatchResult {
  try {
    return JSON.parse(JSON.stringify(result)) as ScanMatchResult;
  } catch {
    return { matches: [], best_match: null };
  }
}

function readOptionalImage(formData: FormData, key: string): File | null {
  const list = formData.getAll(key).filter((x): x is File => x instanceof File && x.size > 0);
  const f = list[0];
  return f instanceof File && f.size > 0 ? f : null;
}

/** GET — capabilities (model enabled when OpenAI key is configured). */
async function GET_handler() {
  return NextResponse.json(scanV2CapabilitiesPayload());
}

/**
 * POST multipart `image` (required), optional `image_back` — v2.5 hybrid when the image decodes
 * (visual holo / rarity / centering / surface heuristics + vision + OCR + catalog), otherwise v2.
 */
async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  try {
    await assertCanCreateScan(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return NextResponse.json(
        {
          success: false,
          error: e.message,
          ...(e.apiCode ? { code: e.apiCode } : {}),
        },
        { status: 403 }
      );
    }
    throw e;
  }

  const multipart = await validateMultipart(request, ctx);
  if (!multipart.ok) return multipart.response;
  const formData = multipart.formData;

  const tier = await getUserTier(supabase);
  const tierBlock = validateScanMultipartForTier(tier, formData);
  if (tierBlock) {
    return NextResponse.json({ success: false, error: tierBlock }, { status: 403 });
  }

  const file = readOptionalImage(formData, "image");
  if (!file) {
    return errorJson(ctx, "image file is required", 400);
  }

  const backFile = readOptionalImage(formData, "image_back");
  if (file.size > MAX_IMAGE_BYTES || (backFile && backFile.size > MAX_IMAGE_BYTES)) {
    return errorJson(ctx, "Image too large (max 15MB each)", 400);
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return errorJson(ctx, "Could not read uploaded image", 400);
  }

  let backBuffer: Buffer | null = null;
  if (backFile) {
    try {
      backBuffer = Buffer.from(await backFile.arrayBuffer());
    } catch {
      return errorJson(ctx, "Could not read optional back image", 400);
    }
  }

  const skipOcr = process.env.SCAN_TEXT_OCR_DISABLED === "1";
  const ocrText = skipOcr ? "" : await runCardOcr(imageBuffer, backBuffer);
  let extracted = parseCardFromOcrText(ocrText);
  let ocrCatalog = await matchExtractedToCatalog(supabase, extracted);

  const mimeType = (file.type && file.type.startsWith("image/") ? file.type : "image/jpeg") as string;
  const vision = await inferCardWithOpenAiVision(imageBuffer, mimeType);

  if (!ocrCatalog.best_match && vision.card_name_guess.trim()) {
    extracted = {
      ...extracted,
      name_guess: vision.card_name_guess.trim(),
      raw_ocr: `${extracted.raw_ocr}\n${vision.card_name_guess.trim()}`.trim(),
    };
    ocrCatalog = await matchExtractedToCatalog(supabase, extracted);
  }

  const { fused, meta } = fuseVisionWithCatalog(vision, ocrCatalog);
  const fallback = meta.fallback_to_ocr_only;
  const baseMatch: ScanMatchResult = fallback
    ? jsonSafeAutoMatch(ocrCatalog)
    : jsonSafeAutoMatch(fused);

  const gray = await bufferToGray(imageBuffer);
  const numberPasses: NumberOcrPass[] = [
    ...(extracted.number_guess?.trim()
      ? [{ label: "primary", number: extracted.number_guess.trim(), weight: 1 }]
      : []),
    ...(vision.card_number_guess?.trim()
      ? [{ label: "vision", number: vision.card_number_guess.trim(), weight: 0.9 }]
      : []),
    ...(await runNumberOcrFallback(imageBuffer, backBuffer)),
  ];

  const ranking = rankScanCandidates({
    autoMatch: baseMatch,
    gray,
    nameQuery: vision.card_name_guess || extracted.name_guess || "",
    numberPasses,
    knownSetIds: baseMatch.matches
      .map((m) => m.set_id)
      .filter((id): id is string => Boolean(id?.trim())),
  });
  const effectiveMatch: ScanMatchResult = rankingToAutoMatch(ranking);

  let normalized = normalizedCardFromExtracted(extracted, effectiveMatch);
  if (!effectiveMatch.best_match) {
    normalized = {
      name: vision.card_name_guess || extracted.name_guess || "",
      number: vision.card_number_guess || extracted.number_guess || "",
      rarity: vision.rarity_guess || "",
      image_url: null,
    };
  }

  const v2Pipeline: ScanV2PersistedPayload["pipeline"] = fallback
    ? "scan_v2_ocr_fallback"
    : "scan_v2_hybrid";

  const visualPack = await runV25VisualIntel(imageBuffer, vision, {
    catalogBestMatchRarity: effectiveMatch.best_match?.rarity ?? null,
  });

  const persisted: ScanV2PersistedPayload | ScanV25PersistedPayload = visualPack.ok
    ? {
        version: 2.5,
        pipeline: fallback ? "scan_v2_5_ocr_fallback" : "scan_v2_5_hybrid",
        auto_match: effectiveMatch,
        ranking,
        normalized,
        ocr_v1_5: {
          extracted,
          auto_match: jsonSafeAutoMatch(ocrCatalog),
        },
        vision_model: vision,
        fusion: meta,
        visual_intel: visualPack.intel,
        ...(visualPack.degraded ? { visual_intel_degraded: true } : {}),
      }
    : {
        version: 2,
        pipeline: v2Pipeline,
        auto_match: effectiveMatch,
        ranking,
        normalized,
        ocr_v1_5: {
          extracted,
          auto_match: jsonSafeAutoMatch(ocrCatalog),
        },
        vision_model: vision,
        fusion: meta,
      };

  const scanPipeline = persisted.version === 2.5 ? persisted.pipeline : v2Pipeline;

  let rawText: string;
  try {
    rawText = JSON.stringify(persisted);
  } catch {
    return errorJson(ctx, "Could not serialize scan payload", 500);
  }

  const usedBeforeScan = await getScanCountThisMonth(supabase);

  const { data: scanRow, error: scanErr } = await supabase
    .from("scan_events")
    .insert({
      user_id: session.userId,
      card_id: null,
      raw_text: rawText,
    })
    .select("id")
    .single();

  if (scanErr || !scanRow) {
    return errorJson(ctx, scanErr?.message ?? "Could not record scan event", 500);
  }

  const scanEventId = scanRow.id;

  await insertScanHistory(supabase, {
    userId: session.userId,
    imageUrl: historyImageFromRanking(ranking),
    bestCatalogCardId: ranking.topCandidate?.catalog_card_id ?? null,
    confidence: ranking.topCandidate?.confidence ?? 0,
    scanEventId,
  });

  if (tier && !isUnlimitedScans(tier.scan_limit)) {
    const usedAfter = usedBeforeScan + 1;
    const { error: bonusErr } = await supabase.rpc("consume_bonus_scan_if_needed", {
      p_user_id: session.userId,
      p_used_count_after: usedAfter,
      p_scan_limit: tier.scan_limit,
    });
    if (bonusErr) {
      logServerError({
        scope: "api",
        route: "/api/scan/v2",
        userId: session.userId,
        err: bonusErr,
      });
    }
  }

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    scan_pipeline: scanPipeline,
    card: normalized,
    scan_event_id: scanEventId,
    extracted,
    auto_match: effectiveMatch,
    ranking,
    ocr_v1_5: persisted.ocr_v1_5,
    vision_model: vision,
    fusion: meta,
    ...(persisted.version === 2.5
      ? {
          visual_intel: persisted.visual_intel,
          ...(persisted.visual_intel_degraded
            ? { visual_intel_degraded: persisted.visual_intel_degraded }
            : {}),
        }
      : {}),
    raw_ai: null,
    had_back_image: Boolean(backBuffer),
  });
}

export const GET = defineRouteSimple("GET /api/scan/v2", GET_handler);
export const POST = defineRouteSimple("POST /api/scan/v2", POST_handler);
