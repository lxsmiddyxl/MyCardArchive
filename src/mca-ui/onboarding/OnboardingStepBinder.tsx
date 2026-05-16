"use client";

import { BinderCreationWizard } from "@/mca-ui/binder/BinderCreationWizard";
import { Button } from "@/mca-ui/button";

export type OnboardingStepBinderProps = {
  onBinderCreated: (binderId: string) => void;
  onSkip: () => void;
};

export function OnboardingStepBinder({ onBinderCreated, onSkip }: OnboardingStepBinderProps) {
  return (
    <div className="space-y-mca-md">
      <div>
        <h2 className="text-xl font-semibold text-mca-ink-strong">Create your first binder</h2>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Binders are digital shelves for your cards—sets, trades, or showcases.
        </p>
      </div>
      <BinderCreationWizard
        redirectOnSuccess={false}
        onCreated={(id) => onBinderCreated(id)}
      />
      <Button type="button" variant="secondary" onClick={onSkip}>
        Skip for now
      </Button>
    </div>
  );
}
