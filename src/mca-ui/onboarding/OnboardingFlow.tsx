"use client";

import { trackProductClientEvent } from "@/lib/analytics/track-product-client";
import { parseProfileTheme } from "@/lib/binders/portfolio-types";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { OnboardingStepBinder } from "@/mca-ui/onboarding/OnboardingStepBinder";
import { OnboardingStepCard } from "@/mca-ui/onboarding/OnboardingStepCard";
import { OnboardingStepDone } from "@/mca-ui/onboarding/OnboardingStepDone";
import { OnboardingStepProfile } from "@/mca-ui/onboarding/OnboardingStepProfile";
import { OnboardingStepWelcome } from "@/mca-ui/onboarding/OnboardingStepWelcome";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export type OnboardingStepId = "welcome" | "binder" | "card" | "profile" | "done";

export type OnboardingFlowProps = {
  initialHandle?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  initialTheme?: string | null;
  initialBannerUrl?: string | null;
};

const STEP_ORDER: OnboardingStepId[] = ["welcome", "binder", "card", "profile", "done"];

export function OnboardingFlow({
  initialHandle,
  initialDisplayName,
  initialAvatarUrl,
  initialTheme,
  initialBannerUrl,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [binderId, setBinderId] = useState<string | null>(null);

  const goTo = useCallback((next: OnboardingStepId) => {
    setStep(next);
    trackProductClientEvent("onboarding_step", { step: next });
    mcaLog.event("onboarding.step", { step: next }, { componentName: "OnboardingFlow", surfaceName: "onboarding" });
  }, []);

  const finish = useCallback(async () => {
    await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => undefined);
    trackProductClientEvent("onboarding_step", { step: "complete" });
    if (binderId) {
      router.push(`/binders/${binderId}`);
    } else {
      router.push("/binders");
    }
    router.refresh();
  }, [binderId, router]);

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="mx-auto max-w-xl space-y-mca-lg">
      <div className="flex gap-mca-xs" aria-hidden>
        {STEP_ORDER.map((id, i) => (
          <div
            key={id}
            className={`h-1 flex-1 rounded-full transition duration-200 ease-mca-standard ${
              i <= stepIndex ? "bg-mca-accent-strong/80" : "bg-mca-border-subtle"
            }`}
          />
        ))}
      </div>

      {step === "welcome" ? <OnboardingStepWelcome onNext={() => goTo("binder")} /> : null}
      {step === "binder" ? (
        <OnboardingStepBinder
          onBinderCreated={(id) => {
            setBinderId(id);
            goTo("card");
          }}
          onSkip={() => goTo("card")}
        />
      ) : null}
      {step === "card" ? (
        <OnboardingStepCard
          binderId={binderId}
          onNext={() => goTo("profile")}
          onSkip={() => goTo("profile")}
        />
      ) : null}
      {step === "profile" ? (
        <OnboardingStepProfile
          initialHandle={initialHandle}
          initialDisplayName={initialDisplayName}
          initialAvatarUrl={initialAvatarUrl}
          initialTheme={parseProfileTheme(initialTheme)}
          initialBannerUrl={initialBannerUrl}
          onNext={() => goTo("done")}
          onSkip={() => goTo("done")}
        />
      ) : null}
      {step === "done" ? <OnboardingStepDone binderId={binderId} onFinish={() => void finish()} /> : null}
    </div>
  );
}
