import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("launch prep phase 2 — sitemap", () => {
  it("includes marketing and feature routes", () => {
    const entries = sitemap();
    const paths = entries.map((e) => new URL(e.url).pathname);
    expect(paths).toContain("/");
    expect(paths).toContain("/features/scanning");
    expect(paths).toContain("/features/binders");
    expect(paths).not.toContain("/embed/b/test");
  });
});
