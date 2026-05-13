import { describe, expect, it } from "vitest";
import {
  MCA_CONTEXT_HEADER,
  errorJson,
  successJson,
  withContextId,
} from "./route-helpers";

describe("API correlation headers (Phase 54)", () => {
  it("sets x-mca-context-id on successJson", () => {
    const ctx = withContextId();
    const res = successJson(ctx, { hello: "world" });
    expect(res.headers.get(MCA_CONTEXT_HEADER)).toBe(ctx.contextId);
  });

  it("sets x-mca-context-id on errorJson", () => {
    const ctx = withContextId();
    const res = errorJson(ctx, "bad", 400);
    expect(res.headers.get(MCA_CONTEXT_HEADER)).toBe(ctx.contextId);
  });
});
