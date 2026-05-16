import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  validateSession,
  withContextId,
  type RouteContext,
} from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/route";

export type BinderRouteSession = {
  ctx: RouteContext;
  supabase: ReturnType<typeof createClient>;
  userId: string;
  binderId: string;
};

/** Validates session + binder ownership for `/api/binders/[binderId]/*` routes. */
export async function resolveBinderRouteSession(
  binderIdRaw: string | undefined
): Promise<
  | { ok: true; session: BinderRouteSession }
  | { ok: false; response: Response }
> {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return { ok: false, response: session.response };

  const binderId = binderIdRaw?.trim() ?? "";
  if (!binderId) {
    return {
      ok: false,
      response: errorJson(ctx, "binderId is required", 400, {
        code: ApiErrorCode.BAD_REQUEST,
      }),
    };
  }

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (binderErr) {
    return {
      ok: false,
      response: errorJson(ctx, safePublicDbMessage(binderErr.message), 500, {
        code: ApiErrorCode.SUPABASE_QUERY,
      }),
    };
  }
  if (!binder) {
    return {
      ok: false,
      response: errorJson(ctx, "Binder not found", 404, {
        code: ApiErrorCode.NOT_FOUND,
      }),
    };
  }

  return {
    ok: true,
    session: { ctx, supabase, userId: session.userId, binderId },
  };
}
