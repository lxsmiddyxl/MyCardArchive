import { describe, expect, it } from "vitest";
import { aggregateCountsByKey } from "./binder-card-counts";

describe("aggregateCountsByKey", () => {
  it("aggregates rows by binder_id", () => {
    const m = aggregateCountsByKey([
      { binder_id: "a" },
      { binder_id: "a" },
      { binder_id: "b" },
      { binder_id: null },
    ]);
    expect(m.get("a")).toBe(2);
    expect(m.get("b")).toBe(1);
    expect(m.size).toBe(2);
  });
});
