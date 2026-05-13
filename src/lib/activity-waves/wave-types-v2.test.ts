import { describe, expect, it } from "vitest";
import { waveIntentFromBandAndHour, waveSnapshotDecay } from "@/lib/activity-waves/wave-types-v2";

describe("wave-types-v2 (Phase 65)", () => {
  it("maps active bands to trade/build by hour", () => {
    expect(waveIntentFromBandAndHour("very_active", 18)).toBe("trade");
    expect(waveIntentFromBandAndHour("very_active", 3)).toBe("build");
  });

  it("decays snapshot staleness", () => {
    expect(waveSnapshotDecay(0)).toBe(1);
    expect(waveSnapshotDecay(24)).toBeLessThan(0.02);
  });
});
