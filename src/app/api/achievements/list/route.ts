import { getAchievementsListPayload } from "@/lib/achievements/list-payload";
import { createClient } from "@/lib/supabase/route";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/achievements/list
 * All achievements with unlocked, progress, requirement_value, rarity, category.
 */
async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getAchievementsListPayload(supabase, user.id);
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 500 });
  }

  const achievements = payload.achievements.map(
    ({
      id,
      slug,
      title,
      description,
      icon,
      category,
      rarity,
      requirement_type,
      requirement_value,
      created_at,
      unlocked,
      progress,
    }) => ({
      id,
      slug,
      title,
      description,
      icon,
      category,
      rarity,
      requirement_type,
      requirement_value,
      created_at,
      unlocked,
      progress,
    })
  );

  return NextResponse.json({ achievements });
}

export const GET = defineRouteNoArgs("GET /api/achievements/list", GET_handler);
