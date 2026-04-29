import { createClient } from "@/lib/supabase/route";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = { slug?: string };

/**
 * POST /api/achievements/force-unlock
 * Development only. Unlocks an achievement for the signed-in user via
 * apply_achievement_unlock (service role).
 */
async function POST_handler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "force-unlock is only available in development" },
      { status: 403 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await service.rpc("apply_achievement_unlock", {
    user_id: user.id,
    achievement_slug: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export const POST = defineRouteSimple("POST /api/achievements/force-unlock", POST_handler);
