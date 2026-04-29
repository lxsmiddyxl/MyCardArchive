import "server-only";

import type { DegradationMode, LoadStateLevel } from "@/lib/load/load-types";

export type { DegradationMode, LoadStateLevel } from "@/lib/load/load-types";

export function loadStateToDegradation(load: LoadStateLevel): DegradationMode {
  switch (load) {
    case "normal":
      return "degrade:none";
    case "elevated":
      return "degrade:light";
    case "high":
      return "degrade:medium";
    case "critical":
      return "degrade:severe";
    default:
      return "degrade:none";
  }
}

export function degradationOverscanScale(mode: DegradationMode): number {
  switch (mode) {
    case "degrade:none":
      return 1;
    case "degrade:light":
      return 0.92;
    case "degrade:medium":
      return 0.78;
    case "degrade:severe":
      return 0.62;
    default:
      return 1;
  }
}

export function degradationTelemetryIntervalScale(mode: DegradationMode): number {
  switch (mode) {
    case "degrade:none":
      return 1;
    case "degrade:light":
      return 1.15;
    case "degrade:medium":
      return 1.45;
    case "degrade:severe":
      return 2;
    default:
      return 1;
  }
}

export function degradationInpProbeScale(mode: DegradationMode): number {
  switch (mode) {
    case "degrade:none":
      return 1;
    case "degrade:light":
      return 1.2;
    case "degrade:medium":
      return 1.6;
    case "degrade:severe":
      return 2.2;
    default:
      return 1;
  }
}

export function degradationReduceMotion(mode: DegradationMode): boolean {
  return mode === "degrade:severe" || mode === "degrade:medium";
}

export function degradationRegionProbeIntervalMs(mode: DegradationMode): number {
  switch (mode) {
    case "degrade:none":
      return 30_000;
    case "degrade:light":
      return 45_000;
    case "degrade:medium":
      return 60_000;
    case "degrade:severe":
      return 120_000;
    default:
      return 30_000;
  }
}
