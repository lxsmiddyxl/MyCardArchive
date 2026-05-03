/**
 * Union of activity-wave API payloads for surfaces that load multiple wave types.
 */
import type {
  ClubActivityWavePayloadDTO,
  PlatformActivityWavePayloadDTO,
  SeasonalWavePayloadDTO,
  SetActivityWavePayloadDTO,
} from "@/lib/dto/activity-waves";

export type ActivityWavePayloadDTO =
  | PlatformActivityWavePayloadDTO
  | SetActivityWavePayloadDTO
  | ClubActivityWavePayloadDTO
  | SeasonalWavePayloadDTO;
