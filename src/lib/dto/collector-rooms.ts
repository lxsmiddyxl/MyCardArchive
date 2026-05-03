/** Client/API shapes for collector rooms (`/api/collector-rooms/*`). */

export type CollectorRoomMemberDTO = {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  username: string | null;
};

export type CollectorRoomPayloadDTO = {
  roomId: string;
  roomType: string;
  topicKey: string | null;
  memberTotal: number;
  members: CollectorRoomMemberDTO[];
};

export type CollectorRoomsActivePayloadDTO = {
  rooms?: CollectorRoomPayloadDTO[];
  spotlights?: string[];
};
