import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { addTradeItem, getTradeById, getTradeItemsSidesByTradeId } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = context.params.id?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid trade id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const sides = await getTradeItemsSidesByTradeId(supabase, id, session.userId);
  if (!sides) {
    return errorJson(ctx, "Trade not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, { offerSideA: sides.offerSideA, offerSideB: sides.offerSideB });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = context.params.id?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid trade id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
  const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
  const side = body.side === "offer" || body.side === "request" ? body.side : null;
  const q = body.quantity;
  const quantity = typeof q === "number" && Number.isFinite(q) && q >= 1 ? q : NaN;

  if (!ownerId || !cardId || !side || !Number.isFinite(quantity)) {
    return errorJson(ctx, "ownerId, cardId, side (offer | request), and quantity (>= 1) are required.", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const result = await addTradeItem(supabase, id, ownerId, cardId, quantity, side);

  if (!result.ok) {
    return errorJson(ctx, result.error, tradeDbErrorStatus(result.error), {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const trade = await getTradeById(supabase, id, session.userId);
  if (!trade) {
    return errorJson(ctx, "Trade not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, { trade });
}

export const GET = defineRoute("GET /api/trades/[id]/items", GET_handler);
export const POST = defineRoute("POST /api/trades/[id]/items", POST_handler);
