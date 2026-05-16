import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { pingPresence, type PresenceMode } from "@/lib/presence/ephemeral-store";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const MODES = new Set<PresenceMode>(["viewing", "editing", "scanning", "adding"]);

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { binderId?: string; mode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const binderId = body.binderId?.trim() ?? "";
  const mode = (body.mode?.trim() ?? "viewing") as PresenceMode;
  if (!binderId) {
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  if (!MODES.has(mode)) {
    return errorJson(ctx, "Invalid mode", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: profile } = await supabase
    .from("social_public_profiles")
    .select("display_name, username, avatar_url")
    .eq("user_id", session.userId)
    .maybeSingle();

  pingPresence({
    binderId,
    userId: session.userId,
    displayName:
      profile?.display_name?.trim() || profile?.username?.trim() || "Collector",
    avatarUrl: profile?.avatar_url ?? null,
    mode,
  });

  return successJson(ctx, { ok: true, binder_id: binderId, mode });
}

export const POST = defineRouteSimple("POST /api/presence/ping", POST_handler);
