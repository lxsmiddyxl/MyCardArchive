import { loadPublicSocialProfile, loadSelfSocialProfile } from "@/lib/social/build-profile";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/profile", surfaceName: "social.profile" } as const;

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params.id?.trim();
  if (!id || !isUuidString(id)) {
    logApiValidationFailure("GET /api/social/profile/[id]", "id", "invalid");
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (id === user.id) {
    const loaded = await loadSelfSocialProfile(supabase, user);
    if ("error" in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }
    return NextResponse.json({ profile: loaded });
  }

  const profile = await loadPublicSocialProfile(supabase, id, user);
  mcaLog.event(
    "social.profile.public_view",
    { subjectUserId: id, viewerId: user.id, visibility: profile.visibility },
    CTX
  );

  return NextResponse.json({ profile });
}

export const GET = defineRoute("GET /api/social/profile/[id]", GET_handler);
