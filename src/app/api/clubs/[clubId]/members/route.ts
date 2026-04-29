import { getClubById, listAllClubs } from "@/lib/clubs/club-catalog";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KNOWN = new Set(listAllClubs().map((c) => c.clubId));

async function GET_handler(request: Request, context: { params: Record<string, string> }) {
  const clubId = decodeURIComponent((context.params.clubId ?? "").trim());
  if (!KNOWN.has(clubId)) {
    return NextResponse.json({ error: "Unknown club" }, { status: 404 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data, error } = await supabase.rpc("get_club_members", {
    p_club_id: clubId,
    p_limit: limit,
    p_offset: offset,
    p_viewer_id: user.id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const club = getClubById(clubId);
  return NextResponse.json({
    clubId,
    displayName: club?.displayName ?? clubId,
    members: Array.isArray(data) ? data : [],
  });
}

export const GET = defineRoute("GET /api/clubs/[clubId]/members", GET_handler);
