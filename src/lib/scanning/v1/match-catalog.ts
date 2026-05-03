import "server-only";

import type { ScanV1ExtractedText } from "@/lib/scanning/types";
import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";
import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type RpcCardHit = {
  id?: string;
  set_id?: string;
  name?: string;
  number?: string;
  rarity?: string | null;
  image_url?: string | null;
  set?: string;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function parseRpcArray(data: unknown): RpcCardHit[] {
  if (!Array.isArray(data)) return [];
  return data as RpcCardHit[];
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

async function runCardSearch(
  supabase: SupabaseClient<Database>,
  query: string,
  setId: string | null,
  limit: number
): Promise<RpcCardHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const { data: rpcData, error: rpcErr } = await supabase.rpc("search_catalog_cards_v1", {
    p_query: q,
    p_set_id: setId,
    p_limit: limit,
  });

  if (!rpcErr && rpcData != null) {
    const rows = parseRpcArray(rpcData);
    if (rows.length > 0) return rows;
  }

  let qb = supabase
    .from("catalog_cards")
    .select("id, set_id, name, number, rarity, image_small, image_large, catalog_sets(name)")
    .ilike("name", `%${escapeIlike(q)}%`)
    .limit(limit);
  if (setId) {
    qb = qb.eq("set_id", setId);
  }
  const { data, error } = await qb;
  if (error || !data) return [];
  return data.map((row) => {
    const cs = row.catalog_sets as { name: string } | { name: string }[] | null;
    const set = Array.isArray(cs) ? (cs[0]?.name ?? "") : (cs?.name ?? "");
    return {
      id: row.id,
      set_id: row.set_id,
      name: row.name,
      number: row.number,
      rarity: row.rarity,
      image_url: row.image_large ?? row.image_small ?? null,
      set,
    };
  });
}

function candidateFromRpc(
  row: RpcCardHit,
  mergedScore: number,
  numberGuess: string,
  setIdFilter: string | null
): AutoMatchCandidate | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!id || !name) return null;
  const setName =
    typeof row.set === "string"
      ? row.set.trim()
      : typeof row.set_id === "string"
        ? row.set_id.trim()
        : "";
  const num = typeof row.number === "string" ? row.number.trim() : "—";
  const rarity =
    row.rarity != null && String(row.rarity).trim() ? String(row.rarity).trim() : null;
  const image_url =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  const set_id = typeof row.set_id === "string" ? row.set_id.trim() : null;

  let confidence = clamp01(mergedScore);
  const ng = numberGuess.trim();
  if (ng && num && num.replace(/^0+/, "") === ng.replace(/^0+/, "")) {
    confidence = clamp01(confidence + 0.12);
  }
  if (setIdFilter && set_id && set_id === setIdFilter) {
    confidence = clamp01(confidence + 0.06);
  }

  return {
    card_name: name,
    set_name: setName || "Unknown",
    number: num || "—",
    rarity,
    image_url,
    confidence,
    catalog_card_id: id,
    set_id,
  };
}

async function resolveSetIdFromCodeGuess(
  supabase: SupabaseClient<Database>,
  code: string
): Promise<string | null> {
  const c = code.trim();
  if (c.length < 2) return null;
  const { data, error } = await supabase
    .from("catalog_sets")
    .select("id")
    .ilike("set_code", c)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data.id;
}

/**
 * Fuzzy catalog match: merges results from primary, name, and number queries (v1.5).
 */
export async function matchExtractedToCatalog(
  supabase: SupabaseClient<Database>,
  extracted: ScanV1ExtractedText
): Promise<AutoMatchResult> {
  const setIdFromCode = extracted.set_code_guess.trim()
    ? await resolveSetIdFromCodeGuess(supabase, extracted.set_code_guess.trim())
    : null;

  const nameQ = extracted.name_guess.trim();
  const numQ = extracted.number_guess.trim();
  const blob = extracted.raw_ocr.trim().slice(0, 72);

  const queries: string[] = [];
  if (nameQ) {
    queries.push(nameQ);
  }
  if (numQ && numQ !== nameQ) {
    queries.push(numQ);
  }
  if (blob.length > 2 && blob !== nameQ && blob !== numQ) {
    queries.push(blob);
  }

  const primary = queries[0] ?? blob.slice(0, 40);
  if (!primary?.trim()) {
    return { matches: [], best_match: null };
  }

  const scoreById = new Map<string, number>();
  const rowById = new Map<string, RpcCardHit>();

  const ingest = (rows: RpcCardHit[], weight: number) => {
    rows.forEach((row, idx) => {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      if (!id) return;
      const rowScore = clamp01(0.58 - idx * 0.018 + weight);
      const prev = scoreById.get(id) ?? 0;
      const merged = Math.max(prev, rowScore) + (prev > 0 && rowScore > 0 ? 0.07 : 0);
      scoreById.set(id, clamp01(merged));
      if (!rowById.has(id)) {
        rowById.set(id, row);
      }
    });
  };

  const orderedUniqueQueries = Array.from(new Set([primary, ...queries])).filter((q) =>
    Boolean(q?.trim())
  );

  let w = 0.14;
  for (const q of orderedUniqueQueries) {
    const rows = await runCardSearch(supabase, q, setIdFromCode, 14);
    ingest(rows, w);
    w = Math.max(0.02, w - 0.035);
  }

  const mergedIds = [...scoreById.entries()].sort((a, b) => b[1] - a[1]);
  const matches: AutoMatchCandidate[] = [];

  for (const [id, sc] of mergedIds) {
    const row = rowById.get(id);
    if (!row) continue;
    const c = candidateFromRpc(row, sc, extracted.number_guess, setIdFromCode);
    if (c) {
      matches.push(c);
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    matches,
    best_match: matches[0] ?? null,
  };
}

export function normalizedCardFromExtracted(
  extracted: ScanV1ExtractedText,
  auto: AutoMatchResult
): NormalizedCard {
  const bm = auto.best_match;
  return {
    name: bm?.card_name?.trim() || extracted.name_guess.trim() || "",
    number:
      (bm?.number && bm.number !== "—" ? bm.number.trim() : "") ||
      extracted.number_guess.trim() ||
      "",
    rarity: bm?.rarity?.trim() ?? "",
    image_url: bm?.image_url ?? null,
  };
}
