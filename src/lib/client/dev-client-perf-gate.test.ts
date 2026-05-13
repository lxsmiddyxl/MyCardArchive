import { describe, expect, it, vi } from "vitest";
import { isDevelopmentNodeEnv } from "./dev-client-perf-gate";

describe("isDevelopmentNodeEnv", () => {
  it("returns true when NODE_ENV is development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevelopmentNodeEnv()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("returns false when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevelopmentNodeEnv()).toBe(false);
    vi.unstubAllEnvs();
  });
});
