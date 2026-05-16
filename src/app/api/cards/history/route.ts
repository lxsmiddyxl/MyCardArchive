import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import type { CardHistoryEntryDTO } from "@/lib/dto/catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

/** GET `?catalog_card_id=` — copies of a catalog card across the user's binders. */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const catalogCardId =
    new URL(request.url).searchParams.get("catalog_card_id")?.trim() ??
    new URL(request.url).searchParams.get("catalogCardId")?.trim() ??
    "";

  if (!catalogCardId) {
    return errorJson(ctx, "catalog_card_id is required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
      total_copies: 0,
      entries: [],
    });
  }

  const { data, error } = await supabase
    .from("cards")
    .select("id, binder_id, created_at, binders(id, name)")
    .eq("user_id", session.userId)
    .eq("catalog_card_id", catalogCardId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      total_copies: 0,
      entries: [],
    });
  }

  const entries: CardHistoryEntryDTO[] = (data ?? []).map((row) => {
    const b = row.binders as { id: string; name: string } | { id: string; name: string }[] | null;
    const binder = Array.isArray(b) ? b[0] : b;
    return {
      card_id: row.id,
      binder_id: row.binder_id,
      binder_name: binder?.name?.trim() || "Binder",
      created_at: row.created_at,
    };
  });

  return successJson(ctx, {
    catalog_card_id: catalogCardId,
    total_copies: entries.length,
    entries,
  });
}

export const GET = defineRouteSimple("GET /api/cards/history", GET_handler);
