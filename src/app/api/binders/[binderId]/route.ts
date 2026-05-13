import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import type { BinderSummaryDTO } from "@/lib/dto/catalog";
import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400, { code: ApiErrorCode.BAD_REQUEST });
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      return errorJson(ctx, safePublicDbMessage(error.message), 500, {
        code: ApiErrorCode.SUPABASE_QUERY,
      });
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }

    return successJson(ctx, { binder: data as BinderSummaryDTO });
  } catch {
    return errorJson(ctx, "Server error", 500, { code: ApiErrorCode.INTERNAL });
  }
}

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400, { code: ApiErrorCode.BAD_REQUEST });
    }

    let body: { name?: string; description?: string | null };
    try {
      body = await request.json();
    } catch {
      return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
    }

    const patch: { name?: string; description?: string | null } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return errorJson(ctx, "name cannot be empty", 400, { code: ApiErrorCode.BAD_REQUEST });
      }
      patch.name = trimmed;
    }

    if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    } else if (body.description === null) {
      patch.description = null;
    }

    if (Object.keys(patch).length === 0) {
      return errorJson(ctx, "No valid fields to update", 400, { code: ApiErrorCode.BAD_REQUEST });
    }

    const { data, error } = await supabase
      .from("binders")
      .update(patch)
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("*")
      .maybeSingle();

    if (error) {
      return errorJson(ctx, safePublicDbMessage(error.message), 500, {
        code: ApiErrorCode.SUPABASE_QUERY,
      });
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }

    return successJson(ctx, { binder: data as BinderSummaryDTO });
  } catch {
    return errorJson(ctx, "Server error", 500, { code: ApiErrorCode.INTERNAL });
  }
}

async function DELETE_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400, { code: ApiErrorCode.BAD_REQUEST });
    }

    const { data, error } = await supabase
      .from("binders")
      .delete()
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return errorJson(ctx, safePublicDbMessage(error.message), 500, {
        code: ApiErrorCode.SUPABASE_QUERY,
      });
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }

    return successJson(ctx, { deleted: true, id: data.id as string });
  } catch {
    return errorJson(ctx, "Server error", 500, { code: ApiErrorCode.INTERNAL });
  }
}

export const GET = defineRoute("GET /api/binders/[binderId]", GET_handler);
export const PATCH = defineRoute("PATCH /api/binders/[binderId]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/binders/[binderId]", DELETE_handler);
