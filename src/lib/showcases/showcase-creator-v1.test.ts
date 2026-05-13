import { describe, expect, it } from "vitest";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import {
  isShowcaseFeaturedFromDescription,
  stripShowcaseMachineLines,
  withShowcaseFeaturedDescription,
} from "@/lib/showcases/showcase-featured-meta";
import { formatShowcaseNoteBody, parseShowcaseNoteBody } from "@/lib/showcases/showcase-notes";

describe("showcase creator v1 (Phase 72)", () => {
  it("round-trips featured meta in description", () => {
    const raw = withShowcaseFeaturedDescription("Hello binder wall.", true);
    expect(isShowcaseFeaturedFromDescription(raw)).toBe(true);
    expect(stripShowcaseMachineLines(raw)).toBe("Hello binder wall.");
    expect(withShowcaseFeaturedDescription(raw, false)).toBe("Hello binder wall.");
  });

  it("maps showcase rows for public API", () => {
    const dto = mapShowcaseRowToPublicV1({
      id: "00000000-0000-4000-8000-000000000099",
      user_id: "00000000-0000-4000-8000-000000000088",
      title: "My chase wall",
      description: "MCA_META:featured=1\nHolo highlights",
      binder_ids: [],
      featured_card_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    expect(dto.is_featured).toBe(true);
    expect(dto.description).toBe("Holo highlights");
  });

  it("formats and parses showcase note bodies", () => {
    const sid = "00000000-0000-4000-8000-0000000000aa";
    const body = formatShowcaseNoteBody(sid, "  Grail story  ");
    expect(body.startsWith(`[[mca:showcase-note:${sid}]]`)).toBe(true);
    expect(parseShowcaseNoteBody(sid, body)).toBe("Grail story");
  });
});
