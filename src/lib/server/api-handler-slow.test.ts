import { describe, expect, it } from "vitest";
import { API_SLOW_HANDLER_MS, shouldFlagSlowApiHandler } from "./api-handler-slow";

describe("api-handler-slow", () => {
  it("uses an 800ms threshold", () => {
    expect(API_SLOW_HANDLER_MS).toBe(800);
  });

  it("flags slow durations", () => {
    expect(shouldFlagSlowApiHandler(799)).toBe(false);
    expect(shouldFlagSlowApiHandler(800)).toBe(true);
    expect(shouldFlagSlowApiHandler(1200)).toBe(true);
  });

  it("ignores non-finite values", () => {
    expect(shouldFlagSlowApiHandler(Number.NaN)).toBe(false);
  });
});
