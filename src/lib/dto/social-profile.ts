/**
 * Profile & social graph DTOs (API handlers + client components).
 */

import type { CollectorRoomPayloadDTO } from "@/lib/dto/collector-rooms";
import type { SocialPresenceSnapshot, SocialProfilePayload } from "@/lib/social/types";

/** `PATCH /api/social/profile` — narrow client shape; server may return more. */
export type SocialProfilePatchResponseDTO = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

/** Full trainer profile projection (alias of canonical social payload). */
export type ProfileDTO = SocialProfilePayload;

/** Presence snapshot for badges / dots — qualitative only on the wire. */
export type PresenceDTO = SocialPresenceSnapshot;

/** `POST /api/profile/update` JSON body. */
export type ProfilePatchDTO = {
  display_name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  website?: string;
  favorite_card?: string;
  favorite_set?: string;
  favorite_color?: string;
};

/** Typical envelope from `POST /api/profile/update`. */
export type ProfileUpdateResponseDTO = {
  error?: string;
  errors?: string[];
  adjusted?: boolean;
};

/** `POST /api/profile/avatar` success shape. */
export type AvatarUploadResponseDTO = {
  avatar_url?: string;
};

/** `POST /api/social/follow` and `POST /api/social/unfollow` body. */
export type FollowMutationDTO = {
  targetUserId: string;
};

/** Follow / unfollow API success variants. */
export type FollowMutationResponseDTO = {
  ok?: boolean;
  targetUserId?: string;
  alreadyFollowing?: boolean;
};

/** Active collector room row (`/api/collector-rooms/active`). */
export type RoomDTO = CollectorRoomPayloadDTO;

/** Minimal room snapshot for ambient activity / waves (no member avatars). */
export type RoomActivityDTO = Pick<
  CollectorRoomPayloadDTO,
  "roomId" | "roomType" | "topicKey" | "memberTotal"
>;
