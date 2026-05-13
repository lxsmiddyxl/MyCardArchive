import { describe, expect, it, vi } from "vitest";
import {
  fetchStaleWhileRevalidate,
  resetSwrCacheForTests,
} from "./stale-whilst-revalidate";

describe("stale-whilst-revalidate", () => {
  it("reuses cache while fresh and skips duplicate fetcher calls", async () => {
    resetSwrCacheForTests();
    const fetcher = vi.fn().mockResolvedValue("only");

    const a = await fetchStaleWhileRevalidate("k", fetcher, {
      staleMs: 999_999,
      maxAgeMs: 999_999_999,
    });
    const b = await fetchStaleWhileRevalidate("k", fetcher, {
      staleMs: 999_999,
      maxAgeMs: 999_999_999,
    });

    expect(a).toBe("only");
    expect(b).toBe("only");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
