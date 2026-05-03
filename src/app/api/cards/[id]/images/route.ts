import { getCardStorageBucketName } from "@/lib/cards/storage-paths";
import { errorJson, successJson, validateMultipart, validateSession, withContextId } from "@/lib/api/route-helpers";
import {
  uploadBackImage,
  uploadFrontImage,
} from "@/lib/storage/cards";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return errorJson(ctx, "Invalid card id", 400);
  }

  const bucket = getCardStorageBucketName();
  if (!bucket) {
    return errorJson(ctx, "Card storage bucket is not configured", 503);
  }

  const { data: cardRow, error: cardErr } = await supabase
    .from("cards")
    .select("id, user_id")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (cardErr) {
    return errorJson(ctx, cardErr.message, 500);
  }
  if (!cardRow) {
    return errorJson(ctx, "Card not found", 404);
  }

  const multipart = await validateMultipart(request, ctx);
  if (!multipart.ok) return multipart.response;
  const formData = multipart.formData;

  const front = formData.get("front");
  const back = formData.get("back");
  const frontFile = front instanceof File && front.size > 0 ? front : null;
  const backFile = back instanceof File && back.size > 0 ? back : null;

  if (!frontFile && !backFile) {
    return errorJson(ctx, "Provide at least one image (front or back)", 400);
  }

  if (frontFile && frontFile.size > MAX_IMAGE_BYTES) {
    return errorJson(ctx, "Front image too large (max 15MB)", 400);
  }
  if (backFile && backFile.size > MAX_IMAGE_BYTES) {
    return errorJson(ctx, "Back image too large (max 15MB)", 400);
  }

  const uploaded: {
    image_front_url?: string;
    image_front_thumb_url?: string;
    image_back_url?: string;
    image_back_thumb_url?: string;
  } = {};
  const warnings: string[] = [];

  try {
    if (frontFile) {
      const ab = await frontFile.arrayBuffer();
      const buf = Buffer.from(ab);
      const result = await uploadFrontImage(supabase, bucket, cardId, buf);
      if (!result.ok) {
        return errorJson(ctx, result.error, 502, { userMessage: result.userMessage });
      }
      uploaded.image_front_url = result.image_front_url;
      uploaded.image_front_thumb_url = result.image_front_thumb_url;
      if (result.partial && result.warning) warnings.push(result.warning);
    }

    if (backFile) {
      const ab = await backFile.arrayBuffer();
      const buf = Buffer.from(ab);
      const result = await uploadBackImage(supabase, bucket, cardId, buf);
      if (!result.ok) {
        return errorJson(ctx, result.error, 502, { userMessage: result.userMessage });
      }
      uploaded.image_back_url = result.image_back_url;
      uploaded.image_back_thumb_url = result.image_back_thumb_url;
      if (result.partial && result.warning) warnings.push(result.warning);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image processing failed";
    return errorJson(
      ctx,
      msg,
      500,
      {
        userMessage:
          "Something went wrong while saving your Pokémon card photos. Try again in a moment.",
      }
    );
  }

  /** Persist: `image_url` = front thumb for binder grids (no extra DB columns). */
  const updatePayload: Record<string, string | null> = {};
  if (uploaded.image_front_thumb_url) {
    updatePayload.image_url = uploaded.image_front_thumb_url;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updErr } = await supabase
      .from("cards")
      .update(updatePayload)
      .eq("id", cardId)
      .eq("user_id", userId);

    if (updErr) {
      return errorJson(ctx, updErr.message, 500);
    }
  }

  return successJson(ctx, {
    partial: warnings.length > 0,
    warnings: warnings.length > 0 ? warnings : undefined,
    urls: {
      ...uploaded,
      image_url: updatePayload.image_url ?? null,
    },
  });
}

export const POST = defineRoute("POST /api/cards/[id]/images", POST_handler);
