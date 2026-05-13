import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { applyExclusiveFeaturedShowcase } from "@/lib/showcases/apply-featured-showcase";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import {
  isShowcaseFeaturedFromDescription,
  stripShowcaseMachineLines,
  withShowcaseFeaturedDescription,
} from "@/lib/showcases/showcase-featured-meta";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const id = context.params.id?.trim() ?? "";
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  if (!isUuidString(id)) {
    return errorJson(ctx, "Invalid id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase.from("collection_showcases").select("*").eq("id", id).maybeSingle();

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (!data) {
    return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(data) });
}

async function PATCH_handler(request: Request, context: { params: Record<string, string> }) {
  const id = context.params.id?.trim() ?? "";
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  if (!isUuidString(id)) {
    return errorJson(ctx, "Invalid id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    binder_ids?: string[];
    featured_card_ids?: string[];
    is_featured?: boolean;
  } | null;

  if (!body) {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: current, error: curErr } = await supabase
    .from("collection_showcases")
    .select("id, description, user_id")
    .eq("id", id)
    .maybeSingle();

  if (curErr) {
    return errorJson(ctx, safePublicDbMessage(curErr.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (!current || current.user_id !== session.userId) {
    return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const wasFeatured = isShowcaseFeaturedFromDescription(current.description);
  const wantsFeatured = typeof body.is_featured === "boolean" ? body.is_featured : wasFeatured;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (body.description === null || typeof body.description === "string") {
    const base =
      body.description === null || body.description.trim() === ""
        ? null
        : stripShowcaseMachineLines(body.description.trim());
    patch.description = withShowcaseFeaturedDescription(base, wantsFeatured);
  } else if (typeof body.is_featured === "boolean") {
    const base = stripShowcaseMachineLines(current.description);
    patch.description = withShowcaseFeaturedDescription(base, wantsFeatured);
  }
  if (Array.isArray(body.binder_ids)) patch.binder_ids = body.binder_ids;
  if (Array.isArray(body.featured_card_ids)) patch.featured_card_ids = body.featured_card_ids;

  const { data, error } = await supabase
    .from("collection_showcases")
    .update(patch)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 400, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (!data) {
    return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  if (body.is_featured === true) {
    const applied = await applyExclusiveFeaturedShowcase(supabase, session.userId, id);
    if (!applied.ok) {
      return errorJson(ctx, applied.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
    }
    const { data: refreshed } = await supabase.from("collection_showcases").select("*").eq("id", id).single();
    return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(refreshed ?? data) });
  }

  return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(data) });
}

export const GET = defineRoute("GET /api/showcases/[id]", GET_handler);
export const PATCH = defineRoute("PATCH /api/showcases/[id]", PATCH_handler);
