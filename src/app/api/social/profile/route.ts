import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/profile", surfaceName: "social.profile" } as const;

const BIO_MAX = 2000;
const FAVORITE_MAX_ITEMS = 50;

async function PATCH_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bio?: unknown; favoriteSets?: unknown };
  try {
    body = (await request.json()) as { bio?: unknown; favoriteSets?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: { bio?: string; favorite_sets?: string[] } = {};

  if (body.bio !== undefined) {
    if (typeof body.bio !== "string") {
      logApiValidationFailure("PATCH /api/social/profile", "bio", "type");
      return NextResponse.json({ error: "bio must be a string" }, { status: 400 });
    }
    patch.bio = body.bio.slice(0, BIO_MAX);
  }

  if (body.favoriteSets !== undefined) {
    if (!Array.isArray(body.favoriteSets)) {
      logApiValidationFailure("PATCH /api/social/profile", "favoriteSets", "type");
      return NextResponse.json({ error: "favoriteSets must be an array of strings" }, { status: 400 });
    }
    patch.favorite_sets = body.favoriteSets
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, FAVORITE_MAX_ITEMS);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: user.id });

  const { error } = await supabase
    .from("social_public_profiles")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("social.profile.extras_saved", { userId: user.id, fields: Object.keys(patch) }, CTX);
  return NextResponse.json({ ok: true });
}

export const PATCH = defineRouteSimple("PATCH /api/social/profile", PATCH_handler);
