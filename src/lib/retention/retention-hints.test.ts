import { describe, expect, it } from "vitest";
import { mergeLastSurfacesJson, parseLastSurfaces } from "@/lib/retention/last-surface-memory";
import { retentionSummary } from "@/lib/retention/recent-activity-hints";

describe("last-surface-memory (Phase 62)", () => {
  it("merges binder and deck ids", () => {
    const a = mergeLastSurfacesJson(null, { binderId: "b1" });
    const b = mergeLastSurfacesJson(a, { deckId: "d1" });
    expect(parseLastSurfaces(b)).toEqual({ binderId: "b1", deckId: "d1" });
  });

  it("preserves unspecified fields on merge", () => {
    const j = mergeLastSurfacesJson(null, { binderId: "x", deckId: "y" });
    const j2 = mergeLastSurfacesJson(j, { binderId: "z" });
    expect(parseLastSurfaces(j2)).toEqual({ binderId: "z", deckId: "y" });
  });
});

describe("retentionSummary", () => {
  it("prefers draft trade hint", () => {
    const s = retentionSummary({
      draftTradeNudge: true,
      last: { binderId: null, deckId: null },
    });
    expect(s).toContain("draft");
  });
});
