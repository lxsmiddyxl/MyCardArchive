import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { ids?: string[]; all?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const readAt = new Date().toISOString();

  if (body.all) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", session.userId)
      .is("read_at", null);
    if (error) {
      return errorJson(ctx, error.message, 500);
    }
    return successJson(ctx, { ok: true, all: true });
  }

  const ids = (body.ids ?? []).filter((id) => typeof id === "string" && id.trim());
  if (!ids.length) {
    return successJson(ctx, { ok: true, updated: 0 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("user_id", session.userId)
    .in("id", ids);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  return successJson(ctx, { ok: true, updated: ids.length });
}

export const POST = defineRouteSimple("POST /api/notifications/read", POST_handler);
