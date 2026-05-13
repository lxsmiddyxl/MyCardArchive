/** Client/API shapes for activity wave routes (`/api/activity-waves/*`). */

import type { PresenceZoneHeatV3DTO } from "@/lib/presence/zone-heat-v3";

export type PlatformWaveCellDTO = {
  day_bucket: number;
  hour_bucket: number;
  wave_band: string;
};

export type PlatformActivityWavePayloadDTO = {
  cells?: PlatformWaveCellDTO[];
  headline?: string;
  spotlights?: string[];
  wave_intent?: "browse" | "build" | "trade" | "explore";
  wave_decay?: number;
  zone_heat?: PresenceZoneHeatV3DTO[];
};

export type SetClubWaveHourDTO = {
  hour_bucket: number;
  wave_band: string;
};

export type SetActivityWavePayloadDTO = {
  hours?: SetClubWaveHourDTO[];
  headline?: string | null;
};

/** Same envelope as set wave (`/api/activity-waves/club`). */
export type ClubActivityWavePayloadDTO = SetActivityWavePayloadDTO;

export type SeasonalWavePayloadDTO = {
  pulseHeadline?: string;
  hours?: SetClubWaveHourDTO[];
};
