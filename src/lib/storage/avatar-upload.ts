/**
 * Avatar uploads to Supabase Storage (authenticated user session).
 * Requires bucket `avatars` (or NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET) with public read.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MAX_EDGE = 512;

export function getAvatarBucket(): string {
  const name = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET?.trim();
  return name && name.length > 0 ? name : "avatars";
}

export async function encodeAvatarJpeg(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "cover", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  imageBuffer: Buffer
): Promise<{ publicUrl: string } | { error: string }> {
  const bucket = getAvatarBucket();
  const body = await encodeAvatarJpeg(imageBuffer);
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) {
    return { error: error.message };
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
