import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { parseRequestBodyZod } from "@/lib/api/request-body-schema";
import { decksCreateBodySchema } from "@/lib/api/schemas/post-bodies";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { trackProductServerEvent } from "@/lib/analytics/track-product-server";
import { assertCanCreateDeck, isDeckLimitError } from "@/lib/decks/limits";
import { logServerError } from "@/lib/server/observability";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const parsed = parseRequestBodyZod(raw, decksCreateBodySchema);
  if (!parsed.ok) {
    return errorJson(ctx, parsed.message, 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  const { name, description, format } = parsed.data as {
    name: string;
    description: string;
    format: string;
  };

  try {
    await assertCanCreateDeck(supabase, session.userId);
  } catch (e) {
    if (isDeckLimitError(e)) {
      return errorJson(ctx, e instanceof Error ? e.message : "Deck limit", 403, {
        code: ApiErrorCode.FORBIDDEN,
      });
    }
    logServerError({ scope: "api", route: "POST /api/decks/create", err: e });
    return errorJson(ctx, "Tier check failed.", 500, { code: ApiErrorCode.INTERNAL });
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: session.userId,
      name,
      description,
      format,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("Deck limit reached") || error.code === "P0001") {
      return errorJson(ctx, safePublicDbMessage(error.message), 403, {
        code: ApiErrorCode.FORBIDDEN,
      });
    }
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  trackProductServerEvent(session.userId, "deck_create", { deckId: data.id });
  return successJson(ctx, { deck: data });
}

export const POST = defineRouteSimple("POST /api/decks/create", POST_handler);
