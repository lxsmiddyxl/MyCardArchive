/**
 * Card image uploads to Supabase Storage (user session client — no service role).
 * Thumbnails upload first; full-size is retried separately so binder thumbs stay reliable.
 */

import { cardImageObjectPath, getPublicUrlForStorageObject } from "@/lib/cards/storage-paths";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const THUMB_WIDTH = 300;
const UPLOAD_MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [180, 420, 900] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resize to max width 300px JPEG (binder thumbnails). */
export async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** Normalize to full-size JPEG for storage. */
export async function encodeFullJpeg(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

export async function processFullAndThumb(imageBuffer: Buffer): Promise<{
  full: Buffer;
  thumb: Buffer;
}> {
  const full = await encodeFullJpeg(imageBuffer);
  const thumb = await generateThumbnail(imageBuffer);
  return { full, thumb };
}

async function uploadBufferWithRetry(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  body: Buffer
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastErr = "Upload failed";
  for (let attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, body, { contentType: "image/jpeg", upsert: true });
    if (!error) return { ok: true };
    lastErr = error.message ?? lastErr;
    if (attempt < UPLOAD_MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAYS_MS[attempt] ?? 400);
    }
  }
  return { ok: false, error: lastErr };
}

export type FrontUploadResult =
  | {
      ok: true;
      image_front_url: string;
      image_front_thumb_url: string;
      partial?: boolean;
      warning?: string;
    }
  | { ok: false; error: string; userMessage: string };

export type BackUploadResult =
  | {
      ok: true;
      image_back_url: string;
      image_back_thumb_url: string;
      partial?: boolean;
      warning?: string;
    }
  | { ok: false; error: string; userMessage: string };

/**
 * Upload front thumb first, then full. If full fails after retries, still succeed with thumb URLs
 * so binder grids always get a thumbnail.
 */
export async function uploadFrontImage(
  supabase: SupabaseClient,
  bucket: string,
  cardId: string,
  imageBuffer: Buffer
): Promise<FrontUploadResult> {
  let full: Buffer;
  let thumb: Buffer;
  try {
    const processed = await processFullAndThumb(imageBuffer);
    full = processed.full;
    thumb = processed.thumb;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image processing failed";
    return {
      ok: false,
      error: msg,
      userMessage:
        "We could not process this image. Try a smaller JPG or PNG, or check your connection.",
    };
  }

  const pathFull = cardImageObjectPath(cardId, "front_full");
  const pathThumb = cardImageObjectPath(cardId, "front_thumb");

  const thumbUp = await uploadBufferWithRetry(supabase, bucket, pathThumb, thumb);
  if (!thumbUp.ok) {
    return {
      ok: false,
      error: thumbUp.error,
      userMessage:
        "Could not save the card thumbnail after several tries. Check Storage settings and your network, then try again.",
    };
  }

  const thumbUrl = getPublicUrlForStorageObject(pathThumb);

  const fullUp = await uploadBufferWithRetry(supabase, bucket, pathFull, full);
  if (!fullUp.ok) {
    return {
      ok: true,
      image_front_url: thumbUrl,
      image_front_thumb_url: thumbUrl,
      partial: true,
      warning:
        "Full-size front image did not upload after retries; your binder will use the thumbnail until you upload again.",
    };
  }

  return {
    ok: true,
    image_front_url: getPublicUrlForStorageObject(pathFull),
    image_front_thumb_url: thumbUrl,
  };
}

export async function uploadBackImage(
  supabase: SupabaseClient,
  bucket: string,
  cardId: string,
  imageBuffer: Buffer
): Promise<BackUploadResult> {
  let full: Buffer;
  let thumb: Buffer;
  try {
    const processed = await processFullAndThumb(imageBuffer);
    full = processed.full;
    thumb = processed.thumb;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image processing failed";
    return {
      ok: false,
      error: msg,
      userMessage:
        "We could not process this image. Try a smaller JPG or PNG, or check your connection.",
    };
  }

  const pathFull = cardImageObjectPath(cardId, "back_full");
  const pathThumb = cardImageObjectPath(cardId, "back_thumb");

  const thumbUp = await uploadBufferWithRetry(supabase, bucket, pathThumb, thumb);
  if (!thumbUp.ok) {
    return {
      ok: false,
      error: thumbUp.error,
      userMessage:
        "Could not save the back thumbnail after several tries. Check Storage settings and your network, then try again.",
    };
  }

  const thumbUrl = getPublicUrlForStorageObject(pathThumb);

  const fullUp = await uploadBufferWithRetry(supabase, bucket, pathFull, full);
  if (!fullUp.ok) {
    return {
      ok: true,
      image_back_url: thumbUrl,
      image_back_thumb_url: thumbUrl,
      partial: true,
      warning:
        "Full-size back image did not upload after retries; detail view will use the thumbnail until you upload again.",
    };
  }

  return {
    ok: true,
    image_back_url: getPublicUrlForStorageObject(pathFull),
    image_back_thumb_url: thumbUrl,
  };
}
