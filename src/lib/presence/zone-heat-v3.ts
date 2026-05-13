/**
 * Presence v3 — coarse “rooms” grouped by `collector_rooms.room_type` with privacy-safe buckets (Phase 74).
 */

export type PresenceZoneHeatV3DTO = {
  zone: string;
  /** Distinct trainers seen in the zone window (bucketed, not exact locations). */
  collector_bucket: "spark" | "gathering" | "steady" | "quiet";
  room_count: number;
};

const ZONE_ORDER = ["live_feed_room", "binder_room", "marketplace_room", "community_room", "default"] as const;

export function bandFromCounts(memberTouches: number, roomCount: number): PresenceZoneHeatV3DTO["collector_bucket"] {
  const score = memberTouches * 2 + roomCount * 5;
  if (score >= 48) return "gathering";
  if (score >= 22) return "spark";
  if (score >= 8) return "steady";
  return "quiet";
}

export function buildZoneHeatFromRoomRows(
  rooms: { room_id: string; room_type: string }[],
  members: { room_id: string; user_id: string }[]
): PresenceZoneHeatV3DTO[] {
  const memberCountByRoom = new Map<string, Set<string>>();
  for (const m of members) {
    if (!m.room_id || !m.user_id) continue;
    if (!memberCountByRoom.has(m.room_id)) memberCountByRoom.set(m.room_id, new Set());
    memberCountByRoom.get(m.room_id)?.add(m.user_id);
  }

  const agg = new Map<string, { rooms: Set<string>; touches: number }>();
  for (const z of ZONE_ORDER) agg.set(z, { rooms: new Set(), touches: 0 });

  for (const r of rooms) {
    const zone = (ZONE_ORDER as readonly string[]).includes(r.room_type) ? r.room_type : "default";
    const bucket = agg.get(zone);
    if (!bucket) continue;
    bucket.rooms.add(r.room_id);
    const set = memberCountByRoom.get(r.room_id);
    bucket.touches += set ? set.size : 0;
  }

  return ZONE_ORDER.map((zone) => {
    const a = agg.get(zone)!;
    return {
      zone,
      room_count: a.rooms.size,
      collector_bucket: bandFromCounts(a.touches, a.rooms.size),
    };
  });
}
