"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";

export type OnboardingStepCardProps = {
  binderId: string | null;
  onNext: () => void;
  onSkip: () => void;
};

export function OnboardingStepCard({ binderId, onNext, onSkip }: OnboardingStepCardProps) {
  const addHref = binderId ? `/binders/${binderId}/add-card` : "/scan";
  const scanHref = binderId ? `/scan?binder=${encodeURIComponent(binderId)}` : "/scan";

  return (
    <Panel className="space-y-mca-lg">
      <Image
        src="/artwork/onboarding/scan.svg"
        alt=""
        width={280}
        height={160}
        className="mx-auto"
      />
      <div>
        <h2 className="text-xl font-semibold text-mca-ink-strong">Add your first card</h2>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Scan a card with your camera or add one manually from the catalog.
        </p>
      </div>
      <div className="flex flex-wrap gap-mca-compact">
        <Link
          href={scanHref}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95"
        >
          Scan a card
        </Link>
        <Link
          href={addHref}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle"
        >
          Add manually
        </Link>
      </div>
      <div className="flex flex-wrap justify-between gap-mca-sm">
        <Button type="button" variant="secondary" onClick={onSkip}>
          Skip
        </Button>
        <Button type="button" variant="primary" onClick={onNext}>
          Continue
        </Button>
      </div>
    </Panel>
  );
}
