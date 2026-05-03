import type { Database } from "@/lib/supabase/types";
import type { ActiveRoomSummary } from "@/lib/collector-rooms/room-presence-label";
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcRow = {
  room_id: string;
  room_type: string;
  topic_key: string | null;
  expires_at: string;
  member_total: number;
};

export async function loadCollectorRoomsByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, ActiveRoomSummary[]>> {
  const out: Record<string, ActiveRoomSummary[]> = {};
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return out;

  try {
    const results = await Promise.all(
      unique.map(async (uid) => {
        const { data, error } = await supabase.rpc("get_active_rooms_for_user", {
          p_user_id: uid,
        });
        if (error || !Array.isArray(data)) {
          return { uid, rows: [] as ActiveRoomSummary[] };
        }
        const rows: ActiveRoomSummary[] = [];
        for (const raw of data as RpcRow[]) {
          const rt = raw.room_type;
          if (
            rt !== "set_room" &&
            rt !== "club_room" &&
            rt !== "live_feed_room" &&
            rt !== "profile_room"
          ) {
            continue;
          }
          rows.push({
            roomType: rt,
            topicKey: raw.topic_key ?? null,
            memberTotal: typeof raw.member_total === "number" ? raw.member_total : 0,
          });
        }
        return { uid, rows };
      })
    );

    for (const r of results) {
      out[r.uid] = r.rows;
    }
  } catch {
    for (const id of unique) out[id] = [];
  }
  return out;
}
