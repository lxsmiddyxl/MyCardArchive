import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type { Database } from "@/lib/supabase/types";
import type { AutoMatchCandidate } from "@/lib/types/auto-match";
import type { SupabaseClient } from "@supabase/supabase-js";

type CatalogCardRow = Pick<
  Database["public"]["Tables"]["catalog_cards"]["Row"],
  | "id"
  | "set_id"
  | "name"
  | "number"
  | "rarity"
  | "image_small"
  | "image_large"
> & {
  catalog_sets?: { name: string } | { name: string }[] | null;
};

function clamp01(x: number): number {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function setDisplayName(row: CatalogCardRow): string {
  try {
    const rel = row.catalog_sets;
    if (rel == null) return row.set_id || "Unknown";
    const n = Array.isArray(rel) ? rel[0]?.name : rel.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    return row.set_id || "Unknown";
  } catch {
    return row.set_id || "Unknown";
  }
}

function normalizeNumberToken(s: string): string {
  const t = (s ?? "").trim().toLowerCase();
  if (!t) return "";
  const n = parseInt(t.replace(/^0+/, "") || "0", 10);
  if (!Number.isNaN(n) && t.match(/^\d+$/)) {
    return String(n);
  }
  return t;
}

function nameSimilarity(a: string, b: string): number {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (y.includes(x) || x.includes(y)) return 0.88;
  const ax = new Set(x.split(/\s+/).filter(Boolean));
  const ay = new Set(y.split(/\s+/).filter(Boolean));
  let inter = 0;
  ax.forEach((w) => {
    if (ay.has(w)) inter += 1;
  });
  const union = ax.size + ay.size - inter;
  return union > 0 ? 0.55 * (inter / union) : 0.35;
}

async function resolveSetId(
  client: SupabaseClient<Database>,
  detectedSetName: string
): Promise<string | null> {
  try {
    const t = detectedSetName.trim();
    if (!t || t.toLowerCase() === "unknown") return null;
    const pat = `%${escapeIlike(t)}%`;
    const { data: byName } = await client
      .from("catalog_sets")
      .select("id")
      .ilike("name", pat)
      .limit(1)
      .maybeSingle();
    if (byName?.id) return byName.id;
    const { data: bySeries } = await client
      .from("catalog_sets")
      .select("id")
      .ilike("series", pat)
      .limit(1)
      .maybeSingle();
    return bySeries?.id ?? null;
  } catch {
    return null;
  }
}

function scoreCandidate(
  ai: NormalizedCard,
  row: CatalogCardRow,
  setIdHint: string | null,
  imageBuffer: Buffer
): number {
  const seed = (imageBuffer?.length ?? 0) % 7;
  let s = nameSimilarity(ai.name, row.name) * 0.62 + seed / 200;
  const numAi = normalizeNumberToken(ai.number);
  const numRow = normalizeNumberToken(row.number);
  if (numAi.length > 0 && numAi === numRow) {
    s += 0.28;
  }
  if (setIdHint && row.set_id === setIdHint) {
    s += 0.22;
  }
  return clamp01(s);
}

function rowToCandidate(
  row: CatalogCardRow,
  score: number
): AutoMatchCandidate {
  const img =
    row.image_large?.trim() ||
    row.image_small?.trim() ||
    null;
  return {
    card_name: row.name,
    set_name: setDisplayName(row),
    number: row.number || "—",
    rarity: row.rarity ?? null,
    image_url: img,
    confidence: clamp01(score),
    catalog_card_id: row.id,
    set_id: row.set_id,
  };
}

/**
 * Loads catalog candidates from Supabase and ranks them with fuzzy name / number / set.
 * Falls back to empty list when the catalog is empty or the query fails.
 * Never throws.
 */
export async function mockReverseImageSearch(
  client: SupabaseClient<Database>,
  imageBuffer: Buffer,
  aiNormalized: NormalizedCard,
  setDetection: { set_name: string; confidence: number }
): Promise<AutoMatchCandidate[]> {
  try {
    const setIdHint = await resolveSetId(client, setDetection.set_name);

    let q = client
      .from("catalog_cards")
      .select("id, set_id, name, number, rarity, image_small, image_large, catalog_sets(name)");

    const nameQ = aiNormalized.name.trim();
    if (nameQ.length >= 2) {
      q = q.ilike("name", `%${escapeIlike(nameQ)}%`);
    }

    if (setIdHint) {
      q = q.eq("set_id", setIdHint);
    }

    const { data, error } = await q.limit(150);
    if (error || !data?.length) {
      return [];
    }

    const rows = data as CatalogCardRow[];
    const scored = rows
      .map((row) => ({
        row,
        score: scoreCandidate(aiNormalized, row, setIdHint, imageBuffer),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => rowToCandidate(x.row, x.score));

    return scored;
  } catch {
    return [];
  }
}
