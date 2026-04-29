/** Supabase Storage object paths under the public card bucket. */

export const CARD_STORAGE_PREFIX = "cards";

export type CardImageKind =
  | "front_full"
  | "front_thumb"
  | "back_full"
  | "back_thumb";

const FILE_NAMES: Record<CardImageKind, string> = {
  front_full: "front_full.jpg",
  front_thumb: "front_thumb.jpg",
  back_full: "back_full.jpg",
  back_thumb: "back_thumb.jpg",
};

export function cardImageObjectPath(cardId: string, kind: CardImageKind): string {
  return `${CARD_STORAGE_PREFIX}/${cardId}/${FILE_NAMES[kind]}`;
}

export function getCardStorageBucketName(): string {
  return (
    process.env.NEXT_PUBLIC_CARD_STORAGE_BUCKET?.trim() || "card-images"
  );
}

/**
 * Public URL for a storage object (same shape as `getPublicUrl` from Supabase client).
 */
export function getPublicUrlForStorageObject(objectPath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  const bucket = getCardStorageBucketName();
  const base = url.replace(/\/$/, "");
  const encodedPath = objectPath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function getCardImagePublicUrls(cardId: string): {
  image_front_full_url: string;
  image_front_thumb_url: string;
  image_back_full_url: string;
  image_back_thumb_url: string;
} {
  return {
    image_front_full_url: getPublicUrlForStorageObject(
      cardImageObjectPath(cardId, "front_full")
    ),
    image_front_thumb_url: getPublicUrlForStorageObject(
      cardImageObjectPath(cardId, "front_thumb")
    ),
    image_back_full_url: getPublicUrlForStorageObject(
      cardImageObjectPath(cardId, "back_full")
    ),
    image_back_thumb_url: getPublicUrlForStorageObject(
      cardImageObjectPath(cardId, "back_thumb")
    ),
  };
}
