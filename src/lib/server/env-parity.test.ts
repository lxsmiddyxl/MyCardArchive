import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getEnvParityReport", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists missing required keys when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { getEnvParityReport } = await import("./env-parity");
    const r = getEnvParityReport();
    expect(r.missingRequired.length).toBeGreaterThanOrEqual(3);
  });

  it("passes when required keys are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const { getEnvParityReport } = await import("./env-parity");
    const r = getEnvParityReport();
    expect(r.missingRequired).toEqual([]);
  });
});
