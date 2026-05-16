import Image from "next/image";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";

export type OnboardingStepWelcomeProps = {
  onNext: () => void;
};

export function OnboardingStepWelcome({ onNext }: OnboardingStepWelcomeProps) {
  return (
    <Panel className="space-y-mca-lg text-center">
      <Image
        src="/artwork/onboarding/welcome.svg"
        alt=""
        width={280}
        height={160}
        className="mx-auto"
        priority
      />
      <div>
        <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-accent/90">
          Welcome to MyCardArchive
        </p>
        <h1 className="mt-mca-sm text-2xl font-semibold tracking-tight text-mca-ink-strong">
          Your Pokémon TCG portfolio starts here
        </h1>
        <p className="mt-mca-md text-sm leading-relaxed text-mca-ink-muted">
          Organize binders, scan cards into your collection, and share your progress with other collectors.
          This quick setup takes about two minutes.
        </p>
      </div>
      <Button type="button" variant="primary" onClick={onNext}>
        Get started
      </Button>
    </Panel>
  );
}
