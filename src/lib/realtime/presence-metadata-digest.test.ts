import { describe, expect, it } from "vitest";
import { presenceMetadataDigest } from "./presence-metadata-digest";

describe("presenceMetadataDigest", () => {
  it("ignores at and sorts keys for deterministic output", () => {
    const a = presenceMetadataDigest({ at: "1", b: 2, a: 1 });
    const b = presenceMetadataDigest({ a: 1, b: 2, at: "2" });
    expect(a).toBe(b);
    expect(a).toContain("a");
  });
});
