import { describe, expect, it } from "vitest";
import { parseRequestBodyZod } from "./request-body-schema";
import { bindersPostBodySchema, decksCreateBodySchema } from "./schemas/post-bodies";

describe("parseRequestBodyZod", () => {
  it("accepts valid binder payloads", () => {
    const r = parseRequestBodyZod({ name: "  My shelf  " }, bindersPostBodySchema);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as { name: string }).name).toBe("My shelf");
  });

  it("rejects invalid deck payloads with a field hint", () => {
    const r = parseRequestBodyZod({ name: "" }, decksCreateBodySchema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/name/i);
  });
});
