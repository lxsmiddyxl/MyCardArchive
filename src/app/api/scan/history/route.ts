import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import type { ScanHistoryEntryDTO } from "@/lib/dto/scan-add";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** GET — recent scan history for the signed-in user. */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : DEFAULT_LIMIT;
  const offsetRaw = Number(searchParams.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const { data, error } = await supabase
    .from("scan_history")
    .select("id, image_url, best_catalog_card_id, confidence, scan_event_id, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      entries: [],
    });
  }

  const catalogIds = [
    ...new Set(
      (data ?? [])
        .map((r) => r.best_catalog_card_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const catalogMeta = new Map<
    string,
    { name: string; set: string; number: string; variant_hint: string | null }
  >();
  if (catalogIds.length > 0) {
    const { data: cards } = await supabase
      .from("catalog_cards")
      .select("id, name, number, rarity, subtypes, catalog_sets(name)")
      .in("id", catalogIds);
    for (const row of cards ?? []) {
      const cs = row.catalog_sets as { name: string } | { name: string }[] | null;
      const setName = Array.isArray(cs) ? (cs[0]?.name ?? "") : (cs?.name ?? "");
      const sub = Array.isArray(row.subtypes) ? row.subtypes : [];
      let variant_hint: string | null = null;
      const subL = sub.map((s) => String(s).toLowerCase());
      if (subL.some((s) => s.includes("reverse"))) variant_hint = "reverse_holo";
      else if (subL.some((s) => s.includes("promo"))) variant_hint = "promo";
      else if (row.rarity?.toLowerCase().includes("holo")) variant_hint = "holo";
      catalogMeta.set(row.id, {
        name: row.name,
        set: setName,
        number: row.number ?? "",
        variant_hint,
      });
    }
  }

  const rows = data ?? [];
  const has_more = rows.length > limit;
  const page = has_more ? rows.slice(0, limit) : rows;

  const entries: ScanHistoryEntryDTO[] = page.map((row) => {
    const meta = row.best_catalog_card_id
      ? catalogMeta.get(row.best_catalog_card_id)
      : undefined;
    return {
      id: row.id,
      image_url: row.image_url,
      best_catalog_card_id: row.best_catalog_card_id,
      confidence: Number(row.confidence) || 0,
      scan_event_id: row.scan_event_id,
      created_at: row.created_at,
      card_name: meta?.name ?? null,
      set_name: meta?.set ?? null,
      number: meta?.number ?? null,
      variant_hint: meta?.variant_hint ?? null,
    };
  });

  return successJson(ctx, {
    entries,
    has_more,
    next_offset: offset + entries.length,
  });
}

export const GET = defineRouteSimple("GET /api/scan/history", GET_handler);
