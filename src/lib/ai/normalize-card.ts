import type { RawAIResponse } from "@/lib/types/ai";

export type NormalizedCard = {
  name: string;
  number: string;
  rarity: string;
  image_url: string | null;
};

function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function pickString(...candidates: unknown[]): string {
  for (const c of candidates) {
    const s = asNonEmptyString(c);
    if (s !== undefined) return s;
  }
  return "";
}

function pickNullableUrl(v: unknown): string | null {
  const s = asNonEmptyString(v);
  if (s === undefined) return null;
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return s;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Coerces arbitrary model output into a stable card shape.
 * Accepts {@link RawAIResponse} or any other value models may return.
 * Never throws; unknown keys and malformed values yield empty strings or null.
 */
export function normalizeCardAIResponse(
  raw: RawAIResponse | unknown
): NormalizedCard {
  if (raw === null || raw === undefined) {
    return { name: "", number: "", rarity: "", image_url: null };
  }

  let obj: Record<string, unknown> | null = null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      return {
        name: pickString(raw),
        number: "",
        rarity: "",
        image_url: null,
      };
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return { name: "", number: "", rarity: "", image_url: null };
  }

  if (!obj) {
    return { name: "", number: "", rarity: "", image_url: null };
  }

  const nested =
    obj.card && typeof obj.card === "object" && !Array.isArray(obj.card)
      ? (obj.card as Record<string, unknown>)
      : null;
  const data =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : null;
  const result =
    obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)
      ? (obj.result as Record<string, unknown>)
      : null;

  const name = pickString(
    obj.name,
    obj.title,
    obj.card_name,
    obj.cardName,
    obj.pokemon,
    nested?.name,
    nested?.title,
    data?.name,
    result?.name
  );

  const number = pickString(
    obj.number,
    obj.card_number,
    obj.cardNumber,
    obj.collector_number,
    obj.collectorNumber,
    obj["#"],
    nested?.number,
    data?.number,
    result?.number
  );

  const rarity = pickString(
    obj.rarity,
    obj.card_rarity,
    obj.cardRarity,
    nested?.rarity,
    data?.rarity,
    result?.rarity
  );

  let image_url = pickNullableUrl(
    obj.image_url ?? obj.imageUrl ?? obj.image ?? obj.artwork_url
  );
  if (image_url === null && nested) {
    image_url = pickNullableUrl(
      nested.image_url ?? nested.imageUrl ?? nested.image
    );
  }
  if (image_url === null && data) {
    image_url = pickNullableUrl(
      data.image_url ?? data.imageUrl ?? data.image
    );
  }

  return { name, number, rarity, image_url };
}
