import { batchInChunks } from "@/lib/server/parallel-batch";
import { describe, expect, it } from "vitest";

describe("batchInChunks (Phase 68)", () => {
  it("runs worker per chunk", async () => {
    const sums = await batchInChunks([1, 2, 3, 4, 5], 2, async (chunk) => [chunk.reduce((a, b) => a + b, 0)]);
    expect(sums).toEqual([3, 7, 5]);
  });
});
