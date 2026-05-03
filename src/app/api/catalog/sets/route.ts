import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/server";
import type { CatalogSetHit } from "@/lib/dto/catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import type { Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

/** GET — list catalog sets, or `?q=` fuzzy search (catalog v1 RPC). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(80, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  if (q.length >= 1) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("search_catalog_sets_v1", {
      p_query: q,
      p_limit: limit,
    });
    if (!rpcErr && rpcData != null) {
      const arr: CatalogSetHit[] = Array.isArray(rpcData)
        ? (rpcData as Database["public"]["Functions"]["search_catalog_sets_v1"]["Returns"])
        : [];
      return NextResponse.json({ success: true, sets: arr });
    }
  }

  const { data, error } = await supabase
    .from("catalog_sets")
    .select("*")
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return errorJson(ctx, error.message, 500, { sets: [] });
  }

  return NextResponse.json({ success: true, sets: data ?? [] });
}

export const GET = defineRouteSimple("GET /api/catalog/sets", GET_handler);
