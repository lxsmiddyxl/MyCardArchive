"use client";

import type { ProfileTheme } from "@/lib/binders/portfolio-types";
import { ProfileSetup } from "@/mca-ui/onboarding/ProfileSetup";
import { Button } from "@/mca-ui/button";

export type OnboardingStepProfileProps = {
  initialHandle?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  initialTheme?: ProfileTheme;
  initialBannerUrl?: string | null;
  onNext: () => void;
  onSkip: () => void;
};

export function OnboardingStepProfile({
  initialHandle,
  initialDisplayName,
  initialAvatarUrl,
  initialTheme = "color",
  initialBannerUrl,
  onNext,
  onSkip,
}: OnboardingStepProfileProps) {
  return (
    <div className="space-y-mca-md">
      <div>
        <h2 className="text-xl font-semibold text-mca-ink-strong">Set up your trainer profile</h2>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Choose a handle, avatar, and theme so other collectors recognize you.
        </p>
      </div>
      <ProfileSetup
        initialHandle={initialHandle}
        initialDisplayName={initialDisplayName}
        initialAvatarUrl={initialAvatarUrl}
        initialTheme={initialTheme}
        initialBannerUrl={initialBannerUrl}
        onSaved={onNext}
      />
      <Button type="button" variant="secondary" onClick={onSkip}>
        Skip profile setup
      </Button>
    </div>
  );
}
