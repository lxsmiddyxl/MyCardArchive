import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";

async function POST_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { error } = await supabase
    .from("profiles")
    .update({ scan_tutorial_seen: true })
    .eq("id", session.userId);

  if (error) {
    return errorJson(ctx, "Could not save scan tutorial status.", 500);
  }

  return successJson(ctx, { scan_tutorial_seen: true });
}

export const POST = defineRouteSimple("POST /api/onboarding/scan-tutorial", POST_handler);
