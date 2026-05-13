import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { parseRequestBodyZod } from "@/lib/api/request-body-schema";
import { bindersPostBodySchema } from "@/lib/api/schemas/post-bodies";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import {
  cacheKeyBindersList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
import type { BinderSummaryDTO } from "@/lib/dto/catalog";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { logServerError } from "@/lib/server/observability";
import {
  defineRouteNoArgs,
  defineRouteSimple,
} from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { trackProductServerEvent } from "@/lib/analytics/track-product-server";
import {
  assertCanCreateBinder,
  isTierLimitError,
} from "@/lib/tier/check-limits";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  // validateSession() sets userId from supabase.auth.getUser().user.id (auth.users.id).
  // GET .eq("user_id", session.userId) matches RLS using (auth.uid() = user_id).


  const hpToken = markHotPathStart("hp:collection:listViewport");
  try {
    const cacheKey = cacheKeyBindersList(session.userId);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return successJson(ctx, cached as { binders: BinderSummaryDTO[] });
      }
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return errorJson(
        ctx,
        safePublicDbMessage(error.message),
        500,
        {
          code: ApiErrorCode.SUPABASE_QUERY,
          ...(process.env.NODE_ENV !== "production"
            ? { hint: "Ensure binders table and RLS exist." }
            : {}),
        }
      );
    }

    const body = { binders: data ?? [] };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlCollectionMs()));
    }
    return successJson(ctx, { binders: body.binders as BinderSummaryDTO[] });
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteNoArgs("GET /api/binders", GET_handler);

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  // insert.user_id: session.userId — satisfies with check (auth.uid() = user_id).

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const parsed = parseRequestBodyZod(raw, bindersPostBodySchema);
  if (!parsed.ok) {
    return errorJson(ctx, parsed.message, 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  const { name, description: descField } = parsed.data as {
    name: string;
    description?: string | null;
  };

  try {
    await assertCanCreateBinder(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return errorJson(ctx, e.message, 403, { code: ApiErrorCode.FORBIDDEN });
    }
    logServerError({ scope: "api", route: "POST /api/binders", err: e });
    return errorJson(ctx, "Unable to create binder.", 500, { code: ApiErrorCode.INTERNAL });
  }

  const description =
    typeof descField === "string" ? descField.trim() || null : descField === null ? null : undefined;

  const insert: {
    user_id: string;
    name: string;
    description?: string | null;
  } = { user_id: session.userId, name };

  if (description !== undefined) {
    insert.description = description;
  }

  const { data, error } = await supabase
    .from("binders")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  trackProductServerEvent(session.userId, "binder_create", { binderId: data.id });
  return successJson(ctx, { binder: data as BinderSummaryDTO });
}

export const POST = defineRouteSimple("POST /api/binders", POST_handler);
