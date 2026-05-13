import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("next.config tuning (Phase 49)", () => {
  it("enables package import optimization for virtualization", () => {
    const raw = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
    expect(raw).toContain("optimizePackageImports");
    expect(raw).toContain("@tanstack/react-virtual");
  });

  it("sets a non-zero image cache TTL", () => {
    const raw = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
    expect(raw).toContain("minimumCacheTTL");
  });

  it("declares static asset cache headers (Phase 53)", () => {
    const raw = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
    expect(raw).toContain("async headers()");
    expect(raw).toContain("/_next/static/:path*");
  });
});
