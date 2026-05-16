import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { trackProductServerEvent } from "@/lib/analytics/track-product-server";

async function POST_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", session.userId);

  if (error) {
    return errorJson(ctx, "Could not save onboarding status.", 500);
  }

  trackProductServerEvent(session.userId, "onboarding_step", { step: "complete" });
  return successJson(ctx, { onboarding_complete: true });
}

export const POST = defineRouteSimple("POST /api/onboarding/complete", POST_handler);
