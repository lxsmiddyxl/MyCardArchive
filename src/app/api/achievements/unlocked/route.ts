import { createClient } from "@/lib/supabase/route";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/achievements/unlocked
 * Achievements the current user has unlocked (full rows + unlocked_at).
 */
async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error: uaError } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  if (uaError) {
    return NextResponse.json({ error: uaError.message }, { status: 500 });
  }

  const list = rows ?? [];
  const ids = list.map((r) => r.achievement_id);
  if (ids.length === 0) {
    return NextResponse.json({ achievements: [] });
  }

  const { data: achRows, error: achError } = await supabase
    .from("achievements")
    .select("*")
    .in("id", ids);

  if (achError) {
    return NextResponse.json({ error: achError.message }, { status: 500 });
  }

  const byId = new Map((achRows ?? []).map((a) => [a.id, a]));

  const achievements = list
    .map((r) => {
      const a = byId.get(r.achievement_id);
      if (!a) {
        return null;
      }
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        description: a.description,
        icon: a.icon,
        requirement_type: a.requirement_type,
        requirement_value: a.requirement_value,
        created_at: a.created_at,
        unlocked_at: r.unlocked_at,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return NextResponse.json({ achievements });
}

export const GET = defineRouteNoArgs("GET /api/achievements/unlocked", GET_handler);
