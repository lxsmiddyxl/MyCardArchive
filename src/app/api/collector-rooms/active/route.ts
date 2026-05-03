import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ActiveRow = {
  room_id: string;
  room_type: string;
  topic_key: string | null;
  expires_at: string;
  member_total: number;
};

type MemberRow = {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
};

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: activeRows, error: activeErr } = await supabase.rpc("get_active_rooms_for_user", {
    p_user_id: user.id,
  });
  if (activeErr) {
    return NextResponse.json({ error: activeErr.message }, { status: 500 });
  }

  const roomsRaw = Array.isArray(activeRows) ? activeRows : [];
  const rooms = await Promise.all(
    roomsRaw.map(async (row) => {
      const r = row as ActiveRow;
      const { data: mems } = await supabase.rpc("get_room_members", { p_room_id: r.room_id });
      const members = (Array.isArray(mems) ? mems : []).slice(0, 8) as MemberRow[];
      return {
        roomId: r.room_id,
        roomType: r.room_type,
        topicKey: r.topic_key,
        expiresAt: r.expires_at,
        memberTotal: r.member_total,
        members: members.map((m) => ({
          userId: m.user_id,
          avatarUrl: m.avatar_url,
          displayName: m.display_name?.trim() || m.username?.trim() || "Trainer",
          username: m.username,
        })),
      };
    })
  );

  const { data: spotlightRows } = await supabase.rpc("get_room_spotlights", { p_limit: 3 });
  const spotlights = Array.isArray(spotlightRows)
    ? (spotlightRows as { note: string }[]).map((s) => s.note).filter(Boolean)
    : [];

  return NextResponse.json({ rooms, spotlights });
}

export const GET = defineRouteSimple("GET /api/collector-rooms/active", GET_handler);
