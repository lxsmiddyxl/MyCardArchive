"use client";

import Image from "next/image";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";

export type OnboardingStepDoneProps = {
  binderId: string | null;
  onFinish: () => void;
};

export function OnboardingStepDone({ binderId, onFinish }: OnboardingStepDoneProps) {
  return (
    <Panel className="space-y-mca-lg text-center">
      <Image
        src="/artwork/onboarding/add-binder.svg"
        alt=""
        width={240}
        height={140}
        className="mx-auto"
      />
      <div>
        <h2 className="text-2xl font-semibold text-mca-ink-strong">You&apos;re all set</h2>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Your binder is ready—add more cards, tune your profile, or explore the feed.
        </p>
      </div>
      <Button type="button" variant="primary" onClick={onFinish}>
        {binderId ? "Open your binder" : "Go to binders"}
      </Button>
    </Panel>
  );
}
