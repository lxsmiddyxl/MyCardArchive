import { mapClubIdsToChips, pickPrimaryClubId } from "@/lib/clubs/club-catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase.rpc("get_user_clubs", { p_user_id: user.id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const ids = (Array.isArray(data) ? data : [])
    .map((r) => (r as { club_id?: string }).club_id)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
  const clubs = mapClubIdsToChips(ids);
  return NextResponse.json({
    clubs,
    primaryClubId: pickPrimaryClubId(ids),
  });
}

export const GET = defineRouteSimple("GET /api/clubs/mine", GET_handler);
