import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("rate-limit-smoke script (Phase 56)", () => {
  it("documents iterations env and health endpoint", () => {
    const raw = readFileSync(path.join(process.cwd(), "scripts/rate-limit-smoke.mjs"), "utf8");
    expect(raw).toContain("/api/health/rate-limits");
    expect(raw).toContain("RATE_LIMIT_SMOKE_ITERATIONS");
  });
});
