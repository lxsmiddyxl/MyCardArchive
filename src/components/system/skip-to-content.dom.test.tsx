/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkipToContent } from "./skip-to-content";

describe("SkipToContent", () => {
  it("targets the main content anchor", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link.getAttribute("href")).toBe("#mca-main-content");
  });
});
