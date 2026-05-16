/** @vitest-environment jsdom */
import { LaunchBanner } from "@/mca-ui/launch/LaunchBanner";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

describe("launch prep phase 5 — launch banner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders launch announcement with link", () => {
    render(<LaunchBanner />);
    expect(screen.getByText(/MyCardArchive is live/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /what's new/i }).getAttribute("href")).toBe("/launch");
  });
});
