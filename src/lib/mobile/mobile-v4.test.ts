import { describe, expect, it } from "vitest";
import { GESTURE_AFFORDANCES } from "@/lib/mobile/gesture-affordances";
import { LIST_LKG_KEYS, writeListLkg, readListLkg, clearListLkg } from "@/lib/offline/list-lkg-cache";

describe("mobile v4 offline (Phase 89)", () => {
  it("defines gesture affordances", () => {
    expect(GESTURE_AFFORDANCES.swipe_refresh.label).toContain("Refresh");
  });

  it("round-trips list LKG in memory env", () => {
    if (typeof window === "undefined") return;
    writeListLkg(LIST_LKG_KEYS.binders, [{ id: "b1" }]);
    const entry = readListLkg<{ id: string }>(LIST_LKG_KEYS.binders);
    expect(entry?.items[0]?.id).toBe("b1");
    clearListLkg(LIST_LKG_KEYS.binders);
  });
});
