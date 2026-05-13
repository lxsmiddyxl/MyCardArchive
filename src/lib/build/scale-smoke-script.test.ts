import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("scale-smoke script (Phase 68)", () => {
  it("documents health endpoint and iterations env", () => {
    const raw = readFileSync(path.join(process.cwd(), "scripts/scale-smoke.mjs"), "utf8");
    expect(raw).toContain("/api/health/ui");
    expect(raw).toContain("SCALE_SMOKE_ITERATIONS");
  });
});
