import { normalizeCardAIResponse } from "@/lib/ai/normalize-card";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logServerError } from "@/lib/server/observability";
import { combineAutoMatch } from "@/lib/auto-match/combine-matches";
import { mockReverseImageSearch } from "@/lib/auto-match/reverse-image";
import { mockDetectSetSymbol } from "@/lib/auto-match/set-detection";
import { mockScanCard, USE_REAL_MODEL } from "@/lib/ai/mock-scan";
import {
  getRealScanConfigError,
  isRealScanConfigError,
  realScanCard,
} from "@/lib/ai/real-scan";
import { updateHaveListIndex } from "@/lib/matching/index-maintenance";
import type { AutoMatchResult } from "@/lib/types/auto-match";
import { hydrateFromScanBestMatch } from "@/mca-utils/catalog/hydrateCardMetadata";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanCreateCard,
  assertCanCreateScan,
  getScanCountThisMonth,
  getUserTier,
  isTierLimitError,
  isUnlimitedScans,
} from "@/lib/tier/check-limits";
import {
  readPaidScanClientOptions,
  validateScanMultipartForTier,
} from "@/lib/tier/scan-tier-policy";
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function jsonSafeAutoMatch(result: AutoMatchResult): AutoMatchResult {
  try {
    return JSON.parse(JSON.stringify(result)) as AutoMatchResult;
  } catch {
    return { matches: [], best_match: null };
  }
}

function cardFieldsFromAuto(
  normalized: ReturnType<typeof normalizeCardAIResponse>,
  autoMatch: AutoMatchResult
): {
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
} {
  const bm = autoMatch.best_match;
  if (bm) {
    const meta = hydrateFromScanBestMatch(bm);
    return {
      name: meta.name || normalized.name.trim(),
      number: meta.number || normalized.number.trim() || null,
      rarity: meta.rarity || normalized.rarity.trim() || null,
      image_url: meta.imageUrl || normalized.image_url,
      catalog_card_id: meta.catalog_card_id || null,
    };
  }
  return {
    name: normalized.name.trim(),
    number: normalized.number.trim() || null,
    rarity: normalized.rarity.trim() || null,
    image_url: normalized.image_url,
    catalog_card_id: null,
  };
}

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with image field" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const tier = await getUserTier(supabase);
  const tierBlock = validateScanMultipartForTier(tier, formData);
  if (tierBlock) {
    return NextResponse.json({ success: false, error: tierBlock }, { status: 403 });
  }

  const imageCandidates = formData
    .getAll("image")
    .filter((x): x is File => x instanceof File && x.size > 0);
  const file = imageCandidates[0];
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "image file is required" },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 15MB)" },
      { status: 400 }
    );
  }

  let imageBuffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    imageBuffer = Buffer.from(ab);
  } catch {
    return NextResponse.json(
      { error: "Could not read uploaded image" },
      { status: 400 }
    );
  }

  let rawAi: unknown;
  try {
    rawAi = USE_REAL_MODEL
      ? await realScanCard(imageBuffer)
      : await mockScanCard(imageBuffer);
  } catch {
    return NextResponse.json(
      { error: "AI scan failed — try again" },
      { status: 502 }
    );
  }

  if (USE_REAL_MODEL && isRealScanConfigError(rawAi)) {
    return NextResponse.json(
      {
        success: false,
        error: getRealScanConfigError(rawAi),
      },
      { status: 503 }
    );
  }

  const normalized = normalizeCardAIResponse(rawAi);

  const setDetection = await mockDetectSetSymbol(imageBuffer);
  const reverseMatches = await mockReverseImageSearch(
    supabase,
    imageBuffer,
    normalized,
    setDetection
  );
  const autoMatchRaw = combineAutoMatch(
    normalized,
    reverseMatches,
    setDetection
  );
  const autoMatch = jsonSafeAutoMatch(autoMatchRaw);

  const binderIdRaw = formData.get("binder_id");
  const binderId =
    typeof binderIdRaw === "string" && binderIdRaw.trim().length > 0
      ? binderIdRaw.trim()
      : null;

  if (binderId) {
    const { data: binder, error: binderErr } = await supabase
      .from("binders")
      .select("id")
      .eq("id", binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (binderErr) {
      return NextResponse.json({ error: binderErr.message }, { status: 500 });
    }

    if (!binder) {
      return NextResponse.json({ error: "Binder not found" }, { status: 404 });
    }
  }

  const clientOpts = readPaidScanClientOptions(tier, formData);

  const rawPayload: Record<string, unknown> = {
    version: 1,
    source_file: file.name,
    content_type: file.type || null,
    ai_raw: rawAi,
    normalized,
    auto_match: autoMatch,
    ...(clientOpts ? { client_scan_options: clientOpts } : {}),
  };

  let rawText: string;
  try {
    rawText = JSON.stringify(rawPayload);
  } catch {
    rawPayload.ai_raw = null;
    rawPayload.note = "ai_raw omitted (not JSON-serializable)";
    try {
      rawText = JSON.stringify(rawPayload);
    } catch {
      rawText = JSON.stringify({
        version: 1,
        source_file: file.name,
        ai_raw: null,
        normalized,
        auto_match: autoMatch,
        note: "partial_payload",
      });
    }
  }

  const usedBeforeScan = await getScanCountThisMonth(supabase);

  const { data: scanRow, error: scanErr } = await supabase
    .from("scan_events")
    .insert({
      user_id: user.id,
      card_id: null,
      raw_text: rawText,
    })
    .select("id")
    .single();

  if (scanErr || !scanRow) {
    return NextResponse.json(
      { error: scanErr?.message ?? "Could not record scan event" },
      { status: 500 }
    );
  }

  const scanEventId = scanRow.id;

  if (tier && !isUnlimitedScans(tier.scan_limit)) {
    const usedAfter = usedBeforeScan + 1;
    const { error: bonusErr } = await supabase.rpc("consume_bonus_scan_if_needed", {
      p_user_id: user.id,
      p_used_count_after: usedAfter,
      p_scan_limit: tier.scan_limit,
    });
    if (bonusErr) {
      logServerError({
        scope: "api",
        route: "/api/scan",
        userId: user.id,
        err: bonusErr,
      });
    }
  }

  const cardPayload = cardFieldsFromAuto(normalized, autoMatch);

  if (binderId) {
    try {
      await assertCanCreateCard(supabase);
    } catch (e) {
      if (isTierLimitError(e)) {
        return NextResponse.json(
          {
            success: false,
            error: e.message,
            scan_event_id: scanEventId,
            raw_ai: rawAi,
            card: normalized,
            auto_match: autoMatch,
          },
          { status: 403 }
        );
      }
      throw e;
    }

    const cardName = cardPayload.name.trim();
    if (!cardName) {
      return NextResponse.json(
        {
          error:
            "Scan did not produce a card name; add details manually or retry",
          scan_event_id: scanEventId,
          raw_ai: rawAi,
          card: normalized,
          auto_match: autoMatch,
          success: false,
        },
        { status: 422 }
      );
    }

    const { data: cardRow, error: cardErr } = await supabase
      .from("cards")
      .insert({
        binder_id: binderId,
        user_id: user.id,
        name: cardName,
        number: cardPayload.number,
        rarity: cardPayload.rarity,
        image_url: cardPayload.image_url,
        ...(cardPayload.catalog_card_id
          ? { catalog_card_id: cardPayload.catalog_card_id }
          : {}),
      })
      .select("id")
      .single();

    if (cardErr || !cardRow) {
      return NextResponse.json(
        {
          error: cardErr?.message ?? "Could not save card",
          scan_event_id: scanEventId,
          raw_ai: rawAi,
          card: normalized,
          auto_match: autoMatch,
          success: false,
        },
        { status: 500 }
      );
    }

    try {
      await updateHaveListIndex(supabase, user.id, cardRow.id, 1);
    } catch (e) {
      await supabase.from("cards").delete().eq("id", cardRow.id).eq("user_id", user.id);
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Could not update have-list index",
          scan_event_id: scanEventId,
          raw_ai: rawAi,
          card: normalized,
          auto_match: autoMatch,
          success: false,
        },
        { status: 500 }
      );
    }

    const { error: linkErr } = await supabase
      .from("scan_events")
      .update({ card_id: cardRow.id })
      .eq("id", scanEventId)
      .eq("user_id", user.id);

    if (linkErr) {
      await supabase.from("cards").delete().eq("id", cardRow.id);
      return NextResponse.json(
        {
          error: linkErr.message,
          scan_event_id: scanEventId,
          raw_ai: rawAi,
          card: normalized,
          auto_match: autoMatch,
          success: false,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    card: normalized,
    scan_event_id: scanEventId,
    raw_ai: rawAi,
    auto_match: autoMatch,
  });
}

export const POST = defineRouteSimple("POST /api/scan", POST_handler);
