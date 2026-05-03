import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/server";
import type { CatalogCardHit } from "@/lib/dto/catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import type { Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function normalizeForMatch(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fallbackRank(hit: CatalogCardHit, query: string): number {
  const qn = normalizeForMatch(query);
  const name = normalizeForMatch(hit.name);
  const num = normalizeForMatch(hit.number);
  const set = normalizeForMatch(hit.set);
  let score = 0;

  if (name === qn) score += 100;
  else if (name.startsWith(qn)) score += 70;
  else if (name.includes(qn)) score += 45;

  if (num && (num === qn || qn === `#${num}` || qn.endsWith(` ${num}`))) {
    score += 42;
  } else if (num && qn.includes(num)) {
    score += 16;
  }

  if (set && qn.length >= 3 && (set === qn || set.includes(qn))) {
    score += 14;
  }

  score += Math.max(0, 14 - Math.min(14, name.length / 3));
  return score;
}

function normalizeRpcHits(raw: unknown): CatalogCardHit[] {
  if (!Array.isArray(raw)) return [];
  const out: CatalogCardHit[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.name === "string" ? o.name : "";
    if (!id || !name) continue;
    const set =
      typeof o.set === "string"
        ? o.set
        : typeof o.set_name === "string"
          ? o.set_name
          : typeof o.set_id === "string"
            ? o.set_id
            : "";
    out.push({
      id,
      name,
      set,
      set_id: typeof o.set_id === "string" ? o.set_id : undefined,
      number: typeof o.number === "string" ? o.number : "",
      rarity: typeof o.rarity === "string" ? o.rarity : null,
      image_url: typeof o.image_url === "string" ? o.image_url : null,
    });
  }
  return out;
}

/**
 * GET `?q=` — catalog card search (Feed v1 RPC: fuzzy + ILIKE + optional `set_id`).
 * Optional: `set_id`, `limit` (max 40). `?name=` is treated like `q`.
 */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const { searchParams } = new URL(request.url);
  const query =
    searchParams.get("q")?.trim() ??
    searchParams.get("name")?.trim() ??
    "";
  const setId = searchParams.get("set_id")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "24", 10);
  const limit = Math.min(40, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 24));

  if (query.length < 1) {
    return errorJson(ctx, "q query is required", 400, { results: [] });
  }

  const supabase = createClient();

  const { data: rpcData, error: rpcErr } = await supabase.rpc("search_catalog_cards_v1", {
    p_query: query,
    p_set_id: setId.length > 0 ? setId : null,
    p_limit: limit,
  });

  if (!rpcErr && rpcData != null) {
    const arr = Array.isArray(rpcData)
      ? (rpcData as Database["public"]["Functions"]["search_catalog_cards_v1"]["Returns"])
      : [];
    return NextResponse.json({ success: true, results: normalizeRpcHits(arr) });
  }

  let qb = supabase
    .from("catalog_cards")
    .select("id, set_id, name, number, rarity, image_small, image_large, catalog_sets(name)")
    .ilike("name", `%${escapeIlike(query)}%`)
    .limit(limit);

  if (setId.length > 0) {
    qb = qb.eq("set_id", setId);
  }

  const { data, error } = await qb;

  if (error) {
    return errorJson(ctx, error.message, 500, { results: [] });
  }

  const results = (data ?? []).map((row) => {
    const cs = row.catalog_sets as { name: string } | { name: string }[] | null;
    const set =
      Array.isArray(cs) ? (cs[0]?.name ?? row.set_id) : (cs?.name ?? row.set_id);
    return {
      id: row.id,
      name: row.name,
      set_id: row.set_id,
      set,
      rarity: row.rarity,
      number: row.number,
      image_url: row.image_large ?? row.image_small ?? null,
    };
  });

  results.sort((a, b) => fallbackRank(b, query) - fallbackRank(a, query));
  return NextResponse.json({ success: true, results });
}

export const GET = defineRouteSimple("GET /api/catalog/search", GET_handler);
