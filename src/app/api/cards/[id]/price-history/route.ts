import { createClient } from "@/lib/supabase/route";
import { errorJson, safeParseNumber, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";

export const dynamic = "force-dynamic";

async function GET_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const cardId = context.params["id"]?.trim();
  if (!cardId) {
    return errorJson(ctx, "Invalid card id", 400);
  }

  const { searchParams } = new URL(request.url);
  const limit = safeParseNumber(searchParams.get("limit"), 30, 1, 200);

  const { data: owned, error: ownErr } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownErr) {
    return errorJson(ctx, ownErr.message, 500);
  }
  if (!owned) {
    return errorJson(ctx, "Card not found", 404);
  }

  const { data, error } = await supabase
    .from("card_price_history")
    .select("id, card_id, market_price, currency, provider, recorded_at")
    .eq("card_id", cardId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  return successJson(ctx, { history: (data ?? []).reverse() });
}

export const GET = defineRoute("GET /api/cards/[id]/price-history", GET_handler);
