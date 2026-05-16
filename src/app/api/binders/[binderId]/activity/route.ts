import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import {
  fetchBinderActivity,
  formatBinderActivityLabel,
} from "@/lib/binders/binder-activity";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { activityPayloadFromJson } from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) {
    const ctx = { contextId: "binder-activity", startedAt: Date.now() } as const;
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, user_id, visibility")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) {
    const ctx = { contextId: "binder-activity", startedAt: Date.now() } as const;
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const visibility = parseBinderVisibility(binder.visibility);
  const isOwner = Boolean(user?.id && user.id === binder.user_id);
  if (!isOwner && !isBinderShareable(visibility)) {
    const ctx = { contextId: "binder-activity", startedAt: Date.now() } as const;
    return errorJson(ctx, "Forbidden", 403, { code: ApiErrorCode.FORBIDDEN });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? "20") || 20)
  );

  const rows = await fetchBinderActivity(supabase, binderId, limit);
  const events = rows.map((row) => {
    const payload = activityPayloadFromJson(row.payload);
    return {
      id: row.id,
      type: row.type,
      payload,
      created_at: row.created_at,
      label: formatBinderActivityLabel(row.type, payload),
    };
  });

  const ctx = { contextId: "binder-activity", startedAt: Date.now() } as const;
  return successJson(ctx, { binder_id: binderId, events });
}

export const GET = defineRoute("GET /api/binders/[binderId]/activity", GET_handler);
