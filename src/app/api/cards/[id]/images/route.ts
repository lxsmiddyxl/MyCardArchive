import { getCardStorageBucketName } from "@/lib/cards/storage-paths";
import {
  uploadBackImage,
  uploadFrontImage,
} from "@/lib/storage/cards";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const bucket = getCardStorageBucketName();
  if (!bucket) {
    return NextResponse.json(
      { error: "Card storage bucket is not configured" },
      { status: 503 }
    );
  }

  const { data: cardRow, error: cardErr } = await supabase
    .from("cards")
    .select("id, user_id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }
  if (!cardRow) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const front = formData.get("front");
  const back = formData.get("back");
  const frontFile = front instanceof File && front.size > 0 ? front : null;
  const backFile = back instanceof File && back.size > 0 ? back : null;

  if (!frontFile && !backFile) {
    return NextResponse.json(
      { error: "Provide at least one image (front or back)" },
      { status: 400 }
    );
  }

  if (frontFile && frontFile.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Front image too large (max 15MB)" }, {
      status: 400,
    });
  }
  if (backFile && backFile.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Back image too large (max 15MB)" }, {
      status: 400,
    });
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
        return NextResponse.json(
          { error: result.error, userMessage: result.userMessage },
          { status: 502 }
        );
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
        return NextResponse.json(
          { error: result.error, userMessage: result.userMessage },
          { status: 502 }
        );
      }
      uploaded.image_back_url = result.image_back_url;
      uploaded.image_back_thumb_url = result.image_back_thumb_url;
      if (result.partial && result.warning) warnings.push(result.warning);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image processing failed";
    return NextResponse.json(
      {
        error: msg,
        userMessage:
          "Something went wrong while saving your Pokémon card photos. Try again in a moment.",
      },
      { status: 500 }
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
      .eq("user_id", user.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    partial: warnings.length > 0,
    warnings: warnings.length > 0 ? warnings : undefined,
    urls: {
      ...uploaded,
      image_url: updatePayload.image_url ?? null,
    },
  });
}

export const POST = defineRoute("POST /api/cards/[id]/images", POST_handler);
