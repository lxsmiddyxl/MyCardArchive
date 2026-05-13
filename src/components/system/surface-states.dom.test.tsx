/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurfaceEmptyState } from "./surface-states";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SurfaceEmptyState", () => {
  it("renders title, description, and primary action", () => {
    render(
      <SurfaceEmptyState
        title="Nothing here"
        description="Add items to see them in this list."
        primaryAction={{ href: "/x", label: "Go" }}
      />
    );
    expect(screen.getByRole("region", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go" }).getAttribute("href")).toBe("/x");
  });
});
