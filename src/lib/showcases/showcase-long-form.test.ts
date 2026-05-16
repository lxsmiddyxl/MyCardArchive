import { describe, expect, it } from "vitest";
import { sanitizeShowcaseLongForm } from "@/lib/showcases/showcase-long-form";

describe("showcase long form (Phase 85)", () => {
  it("strips HTML from long-form body", () => {
    expect(sanitizeShowcaseLongForm("## Title\n\n<script>x</script>")).not.toContain("<");
  });
});
