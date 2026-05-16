import {
  formatBinderActivityLabel,
} from "@/lib/binders/binder-activity";
import {
  isBinderShareable,
  parseBinderVisibility,
} from "@/lib/binders/binder-social-types";
import { activityPayloadFromJson } from "@/lib/binders/binder-social-types";
import { describe, expect, it } from "vitest";

describe("binder upgrade phase 3 — visibility", () => {
  it("parses visibility modes with private default", () => {
    expect(parseBinderVisibility("public")).toBe("public");
    expect(parseBinderVisibility("unlisted")).toBe("unlisted");
    expect(parseBinderVisibility("private")).toBe("private");
    expect(parseBinderVisibility(null)).toBe("private");
    expect(parseBinderVisibility("invalid")).toBe("private");
  });

  it("detects shareable binders", () => {
    expect(isBinderShareable("public")).toBe(true);
    expect(isBinderShareable("unlisted")).toBe(true);
    expect(isBinderShareable("private")).toBe(false);
  });
});

describe("binder upgrade phase 3 — activity labels", () => {
  it("formats known activity types", () => {
    expect(
      formatBinderActivityLabel("visibility_changed", { visibility: "public" })
    ).toContain("public");
    expect(formatBinderActivityLabel("layout_changed", { mode: "set" })).toContain("set");
    expect(formatBinderActivityLabel("card_added", { card_name: "Pikachu" })).toContain(
      "Pikachu"
    );
  });

  it("parses activity payload json", () => {
    expect(activityPayloadFromJson({ mode: "rarity" })).toEqual({ mode: "rarity" });
    expect(activityPayloadFromJson(null)).toEqual({});
    expect(activityPayloadFromJson(["x"])).toEqual({});
  });
});

describe("binder upgrade phase 3 — explore ordering", () => {
  it("dedupes activity binder ids preserving order", () => {
    const rows = [
      { binder_id: "a", created_at: "1" },
      { binder_id: "b", created_at: "2" },
      { binder_id: "a", created_at: "3" },
      { binder_id: "c", created_at: "4" },
    ];
    const ids = [...new Set(rows.map((r) => r.binder_id))].slice(0, 12);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});
