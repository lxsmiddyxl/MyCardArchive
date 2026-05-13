/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSegmentLoading } from "./app-segment-loading";

describe("AppSegmentLoading", () => {
  it("exposes a polite busy status region", () => {
    render(<AppSegmentLoading label="Loading binders" />);
    const region = screen.getByRole("status", { name: "Loading binders" });
    expect(region.getAttribute("aria-busy")).toBe("true");
  });
});
