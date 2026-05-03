/** Phase 26 — qualitative labels only (no DM/chat semantics). */

export type CollectorRoomType = "set_room" | "club_room" | "live_feed_room" | "profile_room";

export type ActiveRoomSummary = {
  roomType: CollectorRoomType;
  topicKey: string | null;
  memberTotal: number;
};

const ROOM_PRIORITY: CollectorRoomType[] = [
  "live_feed_room",
  "set_room",
  "club_room",
  "profile_room",
];

/** Single headline line for flair enrichment (viewer-facing copy elsewhere uses surface-specific strings). */
export function roomPresenceLabelFromActiveRooms(rooms: ActiveRoomSummary[]): string | null {
  if (!rooms.length) return null;
  const ordered = [...rooms].sort(
    (a, b) => ROOM_PRIORITY.indexOf(a.roomType) - ROOM_PRIORITY.indexOf(b.roomType)
  );
  const top = ordered[0];
  switch (top.roomType) {
    case "live_feed_room":
      return "In the live feed";
    case "set_room":
      return "In a Set Room";
    case "club_room":
      return "In a Club Room";
    case "profile_room":
      return "Viewing Profile Together";
    default:
      return null;
  }
}

export function surfaceRoomCaption(roomType: CollectorRoomType): string {
  switch (roomType) {
    case "set_room":
      return "Collectors browsing this set";
    case "club_room":
      return "Active in this club";
    case "profile_room":
      return "Viewing this profile together";
    case "live_feed_room":
      return "Collectors in the live feed";
    default:
      return "Collectors nearby";
  }
}
