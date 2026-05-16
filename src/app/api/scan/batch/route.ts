import { errorJson, validateMultipart, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logServerError } from "@/lib/server/observability";
import type { ScanBatchResultItemDTO, ScanBatchSuccessDTO } from "@/lib/dto/scan-add";
import type { ScanMatchResult } from "@/lib/dto/catalog";
import { fuseVisionWithCatalog } from "@/lib/scanning/v2/hybrid-fusion";
import { inferCardWithOpenAiVision } from "@/lib/scanning/v2/openai-vision-infer";
import {
  matchExtractedToCatalog,
  normalizedCardFromExtracted,
} from "@/lib/scanning/v1/match-catalog";
import { parseCardFromOcrText } from "@/lib/scanning/v1/parse-text";
import { runCardOcr } from "@/lib/scanning/v1/ocr";
import { bufferToGray } from "@/lib/scanning/phase3/to-gray";
import { detectCardRegions } from "@/mca-utils/scan/regionDetection";
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
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MIN_IMAGES = 1;
const MAX_IMAGES = 9;

function readImages(formData: FormData): File[] {
  const keys = ["images", "image"];
  const out: File[] = [];
  for (const key of keys) {
    for (const item of formData.getAll(key)) {
      if (item instanceof File && item.size > 0) out.push(item);
    }
  }
  return out.slice(0, MAX_IMAGES);
}

function jsonSafeAutoMatch(result: ScanMatchResult): ScanMatchResult {
  try {
    return JSON.parse(JSON.stringify(result)) as ScanMatchResult;
  } catch {
    return { matches: [], best_match: null };
  }
}

async function scanRegion(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  imageBuffer: Buffer,
  mimeType: string,
  regionIndex: number,
  region: { x: number; y: number; width: number; height: number }
): Promise<ScanBatchResultItemDTO | null> {
  const meta = await sharp(imageBuffer).metadata();
  let cropBuf = imageBuffer;
  try {
    const iw = meta.width ?? 0;
    const ih = meta.height ?? 0;
    const left = Math.max(0, Math.floor(region.x));
    const top = Math.max(0, Math.floor(region.y));
    const width = Math.min(Math.floor(region.width), iw - left);
    const height = Math.min(Math.floor(region.height), ih - top);
    if (width >= 8 && height >= 8) {
      cropBuf = await sharp(imageBuffer).extract({ left, top, width, height }).toBuffer();
    }
  } catch {
    /* use full image */
  }

  const ocrText = await runCardOcr(cropBuf, null);
  let extracted = parseCardFromOcrText(ocrText);
  let ocrCatalog = await matchExtractedToCatalog(supabase, extracted);
  const vision = await inferCardWithOpenAiVision(cropBuf, mimeType);
  if (!ocrCatalog.best_match && vision.card_name_guess.trim()) {
    extracted = {
      ...extracted,
      name_guess: vision.card_name_guess.trim(),
      raw_ocr: `${extracted.raw_ocr}\n${vision.card_name_guess.trim()}`.trim(),
    };
    ocrCatalog = await matchExtractedToCatalog(supabase, extracted);
  }
  const { fused, meta: fusionMeta } = fuseVisionWithCatalog(vision, ocrCatalog);
  const baseMatch = fusionMeta.fallback_to_ocr_only
    ? jsonSafeAutoMatch(ocrCatalog)
    : jsonSafeAutoMatch(fused);

  const gray = await bufferToGray(cropBuf);
  const numberPasses: NumberOcrPass[] = [
    ...(extracted.number_guess?.trim()
      ? [{ label: "primary", number: extracted.number_guess.trim(), weight: 1 }]
      : []),
    ...(await runNumberOcrFallback(cropBuf, null)),
  ];
  const ranking = rankScanCandidates({
    autoMatch: baseMatch,
    gray,
    nameQuery: vision.card_name_guess || extracted.name_guess || "",
    numberPasses,
  });
  const effectiveMatch = rankingToAutoMatch(ranking);
  const card = normalizedCardFromExtracted(extracted, effectiveMatch);

  const persisted = {
    version: 2.5 as const,
    pipeline: "scan_batch_v3" as const,
    region_index: regionIndex,
    auto_match: effectiveMatch,
    ranking,
    normalized: card,
  };

  const { data: scanRow, error: scanErr } = await supabase
    .from("scan_events")
    .insert({
      user_id: userId,
      card_id: null,
      raw_text: JSON.stringify(persisted),
    })
    .select("id")
    .single();

  if (scanErr || !scanRow) return null;

  await insertScanHistory(supabase, {
    userId,
    imageUrl: historyImageFromRanking(ranking),
    bestCatalogCardId: ranking.topCandidate?.catalog_card_id ?? null,
    confidence: ranking.topCandidate?.confidence ?? 0,
    scanEventId: scanRow.id,
  });

  return {
    region_index: regionIndex,
    scan_event_id: scanRow.id,
    ranking,
    card,
    auto_match: effectiveMatch,
  };
}

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  try {
    await assertCanCreateScan(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 });
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

  const files = readImages(formData);
  if (files.length < MIN_IMAGES) {
    return errorJson(ctx, "At least one image is required (up to 9)", 400);
  }
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) {
      return errorJson(ctx, "Each image must be under 15MB", 400);
    }
  }

  const results: ScanBatchResultItemDTO[] = [];
  let regionOffset = 0;

  for (const file of files) {
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = (file.type?.startsWith("image/") ? file.type : "image/jpeg") as string;
    const gray = await bufferToGray(imageBuffer);
    const meta = await sharp(imageBuffer).metadata();
    const iw = meta.width ?? 1;
    const ih = meta.height ?? 1;
    const regions = gray
      ? detectCardRegions(gray, 3)
      : [{ x: 0, y: 0, width: iw, height: ih, score: 1 }];

    for (const region of regions.slice(0, 3)) {
      if (results.length >= MAX_IMAGES) break;
      try {
        const item = await scanRegion(
          supabase,
          session.userId,
          imageBuffer,
          mimeType,
          regionOffset,
          region
        );
        if (item) results.push(item);
        regionOffset += 1;
      } catch (err) {
        logServerError({
          scope: "api",
          route: "/api/scan/batch",
          userId: session.userId,
          err,
        });
      }
    }
  }

  const tierAfter = await getUserTier(supabase);
  if (tierAfter && !isUnlimitedScans(tierAfter.scan_limit) && results.length > 0) {
    const usedBefore = await getScanCountThisMonth(supabase);
    const usedAfter = usedBefore + results.length;
    const { error: bonusErr } = await supabase.rpc("consume_bonus_scan_if_needed", {
      p_user_id: session.userId,
      p_used_count_after: usedAfter,
      p_scan_limit: tierAfter.scan_limit,
    });
    if (bonusErr) {
      logServerError({
        scope: "api",
        route: "/api/scan/batch",
        userId: session.userId,
        err: bonusErr,
      });
    }
  }

  const body: ScanBatchSuccessDTO = { success: true, results };
  return NextResponse.json({ ...body, context_id: ctx.contextId });
}

export const POST = defineRouteSimple("POST /api/scan/batch", POST_handler);
