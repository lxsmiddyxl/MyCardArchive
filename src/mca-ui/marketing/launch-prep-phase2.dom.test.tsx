/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MarketingLanding } from "@/mca-ui/marketing/MarketingLanding";
import { FeaturePageLayout } from "@/mca-ui/marketing/FeaturePageLayout";
import { FEATURE_PAGES } from "@/mca-ui/marketing/marketing-content";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

describe("launch prep phase 2 — marketing homepage", () => {
  it("renders hero and CTA", () => {
    render(<MarketingLanding />);
    expect(screen.getByText(/Your cards\. Organized/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /start free/i }).getAttribute("href")).toBe("/auth/sign-up");
  });
});

describe("launch prep phase 2 — feature page", () => {
  it("renders scanning feature", () => {
    const config = FEATURE_PAGES[0]!;
    render(<FeaturePageLayout config={config} />);
    expect(screen.getByRole("heading", { name: config.headline })).toBeTruthy();
  });
});
