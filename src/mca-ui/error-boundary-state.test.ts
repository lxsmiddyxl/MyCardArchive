import { describe, expect, it } from "vitest";
import { MCAErrorBoundary } from "./error-boundary";

describe("MCAErrorBoundary", () => {
  it("maps render errors into recoverable state", () => {
    const err = new Error("unit failure");
    expect(MCAErrorBoundary.getDerivedStateFromError(err)).toEqual({
      error: err,
      errorInfo: null,
    });
  });
});
