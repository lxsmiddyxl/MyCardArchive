/** Client/API shapes for activity wave routes (`/api/activity-waves/*`). */

export type PlatformWaveCellDTO = {
  day_bucket: number;
  hour_bucket: number;
  wave_band: string;
};

export type PlatformActivityWavePayloadDTO = {
  cells?: PlatformWaveCellDTO[];
  headline?: string;
  spotlights?: string[];
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
