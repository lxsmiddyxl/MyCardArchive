import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function resolveCatalogSetIdsFromQuery(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 3
): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  const { data: rpcData, error: rpcErr } = await supabase.rpc("search_catalog_sets_v1", {
    p_query: q,
    p_limit: limit,
  });

  if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
    return rpcData
      .map((row) => (row && typeof row === "object" && "id" in row ? String((row as { id: string }).id) : ""))
      .filter(Boolean);
  }

  const { data } = await supabase
    .from("catalog_sets")
    .select("id")
    .or(`name.ilike.%${q}%,set_code.ilike.%${q}%`)
    .limit(limit);

  return (data ?? []).map((r) => r.id).filter(Boolean);
}

export async function resolveCatalogSetIdFromCode(
  supabase: SupabaseClient<Database>,
  setCode: string
): Promise<string | null> {
  const code = setCode.trim().toUpperCase();
  if (!code) return null;

  const { data } = await supabase
    .from("catalog_sets")
    .select("id")
    .ilike("set_code", code)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
