import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import {
  computeAutoLayoutAssignments,
  sortCardsForLayout,
} from "@/mca-utils/binders/autoLayout";
import { buildSlotsForPage } from "@/mca-utils/binders/binder-page-grid";
import {
  canDropSlot,
  isSameSlotRef,
  parseSlotCoordKey,
  parseSlotDragPayload,
  serializeSlotDragPayload,
  slotCoordKey,
} from "@/mca-utils/binders/dragAndDrop";
import {
  binderThemeStorageKey,
  getBinderThemeClasses,
} from "@/mca-utils/binders/binder-theme";
import { describe, expect, it } from "vitest";

describe("binder upgrade phase 2 — drag and drop", () => {
  it("serializes and parses slot drag payload", () => {
    const raw = serializeSlotDragPayload({ page: 2, slot: 4 });
    expect(parseSlotDragPayload(raw)).toEqual({ page: 2, slot: 4 });
  });

  it("validates drop targets", () => {
    const from = { page: 0, slot: 1 };
    const to = { page: 0, slot: 2 };
    expect(canDropSlot(from, to)).toBe(true);
    expect(isSameSlotRef(from, to)).toBe(false);
    expect(canDropSlot(from, from)).toBe(false);
  });

  it("parses virtual slot coord keys", () => {
    expect(slotCoordKey(3, 7)).toBe("p3-s7");
    expect(parseSlotCoordKey("p3-s7")).toEqual({ page: 3, slot: 7 });
  });
});

describe("binder upgrade phase 2 — page grid", () => {
  it("builds nine slots per page with placeholders", () => {
    const pages = {
      "0": [
        {
          id: "slot-1",
          binder_id: "b",
          page_number: 0,
          slot_index: 0,
          card_id: "c1",
          created_at: "",
          card: {
            id: "c1",
            name: "Pika",
            image_url: null,
            rarity: "Common",
            number: "25",
            binder_id: "b",
          },
        },
      ],
    };
    const slots = buildSlotsForPage(pages, 0);
    expect(slots).toHaveLength(BINDER_SLOTS_PER_PAGE);
    expect(slots[0]!.cardId).toBe("c1");
    expect(slots[1]!.cardId).toBeNull();
  });
});

describe("binder upgrade phase 2 — auto layout", () => {
  const cards = [
    { id: "a", number: "10", rarity: "Rare", set_id: "s2", set_name: "Jungle" },
    { id: "b", number: "2", rarity: "Common", set_id: "s1", set_name: "Base" },
    { id: "c", number: "25", rarity: "Common", set_id: "s1", set_name: "Base" },
  ];

  it("sorts by number", () => {
    const sorted = sortCardsForLayout(cards, "number");
    expect(sorted.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("assigns sequential slots", () => {
    const assignments = computeAutoLayoutAssignments(cards, "set");
    expect(assignments).toHaveLength(3);
    expect(assignments[0]).toMatchObject({ page: 0, slot: 0, card_id: "b" });
    expect(assignments[2]!.slot).toBe(2);
  });
});

describe("binder upgrade phase 2 — themes", () => {
  it("uses stable storage keys", () => {
    expect(binderThemeStorageKey("abc")).toContain("abc");
  });

  it("applies theme class bundles", () => {
    expect(getBinderThemeClasses("dark", "binder-x").shell).toContain("zinc");
    expect(getBinderThemeClasses("holo", "binder-x").holoOverlay).toBe(true);
    expect(getBinderThemeClasses("default", "binder-x").shell).toContain("mca-surface");
  });
});

describe("binder upgrade phase 2 — API routes", () => {
  it("defines POST handlers for phase 2 binder routes", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "src/app/api/binders/[binderId]");
    const specs: Record<string, string> = {
      move: "swapBinderSlots",
      copy: "copyCardToSlot",
      remove: "assignCardToSlot",
      layout: "computeAutoLayoutAssignments",
    };
    for (const [segment, needle] of Object.entries(specs)) {
      const src = await fs.readFile(path.join(root, segment, "route.ts"), "utf8");
      expect(src).toContain("export const POST");
      expect(src).toContain(needle);
    }
  });
});
