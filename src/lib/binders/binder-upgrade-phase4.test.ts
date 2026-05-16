import {
  dedupeExploreActivity,
  milestoneLabel,
  sortExploreActivity,
} from "@/lib/explore/binder-activity-feed";
import {
  getBinderPresence,
  pingPresence,
} from "@/lib/presence/ephemeral-store";
import { describe, expect, it, beforeEach } from "vitest";

describe("binder upgrade phase 4 — presence", () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & { __mcaEphemeralPresence?: unknown };
    delete g.__mcaEphemeralPresence;
  });

  it("tracks and lists binder viewers", () => {
    pingPresence({
      binderId: "b1",
      userId: "u1",
      displayName: "Ash",
      mode: "viewing",
    });
    pingPresence({
      binderId: "b1",
      userId: "u2",
      displayName: "Misty",
      mode: "editing",
    });
    const viewers = getBinderPresence("b1");
    expect(viewers).toHaveLength(2);
    expect(viewers.map((v) => v.userId).sort()).toEqual(["u1", "u2"]);
  });
});

describe("binder upgrade phase 4 — explore activity", () => {
  it("sorts and dedupes activity items", () => {
    const items = sortExploreActivity([
      {
        id: "a",
        kind: "x",
        label: "older",
        href: null,
        created_at: "2020-01-01T00:00:00Z",
      },
      {
        id: "b",
        kind: "x",
        label: "newer",
        href: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(items[0]?.id).toBe("b");

    const deduped = dedupeExploreActivity([
      ...items,
      {
        id: "b",
        kind: "x",
        label: "dup",
        href: null,
        created_at: "2026-01-02T00:00:00Z",
      },
    ]);
    expect(deduped).toHaveLength(2);
  });

  it("labels binder milestones", () => {
    expect(milestoneLabel(49)).toBeNull();
    expect(milestoneLabel(50)).toContain("50%");
    expect(milestoneLabel(100)).toContain("100%");
  });
});
