import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { assertCanCreateDeck, isDeckLimitError } from "@/lib/decks/limits";
import { logServerError } from "@/lib/server/observability";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  description?: string;
  format?: string;
};

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return errorJson(ctx, "name is required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const description =
    typeof body.description === "string" ? body.description : "";
  const format =
    typeof body.format === "string" && body.format.trim()
      ? body.format.trim()
      : "standard";

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

  return successJson(ctx, { deck: data });
}

export const POST = defineRouteSimple("POST /api/decks/create", POST_handler);
