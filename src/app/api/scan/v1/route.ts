import { errorJson, validateMultipart, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logServerError } from "@/lib/server/observability";
import type { ScanMatchResult } from "@/lib/dto/catalog";
import {
  matchExtractedToCatalog,
  normalizedCardFromExtracted,
} from "@/lib/scanning/v1/match-catalog";
import { parseCardFromOcrText } from "@/lib/scanning/v1/parse-text";
import { runCardOcr } from "@/lib/scanning/v1/ocr";
import type { ScanTextV1PersistedPayload } from "@/lib/scanning/types";
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

/** OCR can be slow on first language load; optional second image doubles work. */
export const maxDuration = 60;

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

/**
 * POST multipart `image` (required), optional `image_back` — OCR + fuzzy catalog match (v1.5).
 * Records `scan_events` with payload compatible with Add Card (`auto_match` in `raw_text`).
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
  const extracted = parseCardFromOcrText(ocrText);
  const autoMatchRaw = await matchExtractedToCatalog(supabase, extracted);
  const autoMatch = jsonSafeAutoMatch(autoMatchRaw);
  const normalized = normalizedCardFromExtracted(extracted, autoMatch);

  const persisted: ScanTextV1PersistedPayload = {
    version: 1,
    pipeline: "text_ocr_v1_5",
    extracted,
    auto_match: autoMatch,
    normalized,
  };

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
        route: "/api/scan/v1",
        userId: session.userId,
        err: bonusErr,
      });
    }
  }

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    scan_pipeline: "text_ocr_v1_5",
    card: normalized,
    scan_event_id: scanEventId,
    extracted,
    auto_match: autoMatch,
    raw_ai: null,
    had_back_image: Boolean(backBuffer),
  });
}

export const POST = defineRouteSimple("POST /api/scan/v1", POST_handler);
