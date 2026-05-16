import { describe, expect, it } from "vitest";
import { stripThreadPrefix, threadIdFromBody, withThreadIdPrefix } from "@/lib/community/community-v3-threads";

const TID = "00000000-0000-4000-8000-000000000099";

describe("community v3 threads (Phase 86)", () => {
  it("round-trips thread prefix", () => {
    const body = withThreadIdPrefix("Hello trainers", TID);
    expect(threadIdFromBody(body)).toBe(TID);
    expect(stripThreadPrefix(body)).toBe("Hello trainers");
  });
});
