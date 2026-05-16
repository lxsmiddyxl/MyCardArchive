import {
  formatBinderDescription,
  BINDER_KIND_LABELS,
} from "@/lib/onboarding/binder-wizard-types";
import {
  isOnboardingExemptPath,
  needsOnboardingExperience,
  shouldRedirectToOnboarding,
} from "@/mca-utils/onboarding/checkOnboarding";
import { describe, expect, it } from "vitest";

describe("launch prep phase 1 — onboarding redirect", () => {
  it("redirects when onboarding is incomplete", () => {
    expect(shouldRedirectToOnboarding({ onboarding_complete: false, scan_tutorial_seen: false }, "/feed")).toBe(
      true
    );
    expect(shouldRedirectToOnboarding({ onboarding_complete: true, scan_tutorial_seen: false }, "/feed")).toBe(
      false
    );
  });

  it("exempts onboarding and binder flows", () => {
    expect(isOnboardingExemptPath("/onboarding")).toBe(true);
    expect(isOnboardingExemptPath("/binders/new")).toBe(true);
    expect(isOnboardingExemptPath("/scan")).toBe(true);
    expect(isOnboardingExemptPath("/binders/abc-123/add-card")).toBe(true);
    expect(shouldRedirectToOnboarding({ onboarding_complete: false, scan_tutorial_seen: false }, "/onboarding")).toBe(
      false
    );
  });

  it("detects first-run experience need", () => {
    expect(needsOnboardingExperience({ onboarding_complete: false, scan_tutorial_seen: false }, 0)).toBe(true);
    expect(needsOnboardingExperience({ onboarding_complete: true, scan_tutorial_seen: true }, 0)).toBe(true);
    expect(needsOnboardingExperience({ onboarding_complete: true, scan_tutorial_seen: true }, 2)).toBe(false);
  });
});

describe("launch prep phase 1 — binder wizard", () => {
  it("formats binder descriptions with kind label", () => {
    expect(formatBinderDescription("trade", "For locals")).toContain(BINDER_KIND_LABELS.trade);
    expect(formatBinderDescription("set", null)).toBe(`${BINDER_KIND_LABELS.set}.`);
  });
});
