/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { EmptyStateBinders } from "@/mca-ui/empty-states/EmptyStateBinders";
import { OnboardingStepWelcome } from "@/mca-ui/onboarding/OnboardingStepWelcome";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

describe("launch prep phase 1 — empty state rendering", () => {
  it("renders binder empty state with CTA", () => {
    render(<EmptyStateBinders />);
    expect(screen.getByRole("region", { name: /no binders yet/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /create binder/i }).getAttribute("href")).toBe("/binders/new");
  });
});

describe("launch prep phase 1 — onboarding welcome", () => {
  it("renders welcome step", () => {
    render(<OnboardingStepWelcome onNext={vi.fn()} />);
    expect(screen.getByText(/MyCardArchive/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /get started/i })).toBeTruthy();
  });
});
