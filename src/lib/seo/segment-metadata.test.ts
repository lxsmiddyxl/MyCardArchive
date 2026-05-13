import { describe, expect, it } from "vitest";
import { mcaSegmentMetadata } from "./segment-metadata";

describe("mcaSegmentMetadata", () => {
  it("normalizes path and sets canonical + openGraph", () => {
    const m = mcaSegmentMetadata({
      title: "Binders",
      description: "Organize Pokémon cards in digital binders.",
      path: "binders",
    });
    expect(m.title).toBe("Binders");
    expect(m.description).toBe("Organize Pokémon cards in digital binders.");
    expect(m.alternates?.canonical).toBe("/binders");
    expect(m.openGraph?.url).toBe("/binders");
  });
});
