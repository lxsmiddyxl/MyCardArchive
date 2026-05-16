"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const STEPS = [
  {
    title: "Center the card",
    body: "Fill the frame with the card front—keep edges parallel to the screen for the best match.",
  },
  {
    title: "Avoid glare",
    body: "Tilt slightly to dodge reflections. Soft, even light beats a harsh flash.",
  },
  {
    title: "Batch mode for stacks",
    body: "Scanning several cards? Use batch mode to queue results and add them to a binder faster.",
  },
] as const;

export type ScanTutorialOverlayProps = {
  initialSeen: boolean;
};

export function ScanTutorialOverlay({ initialSeen }: ScanTutorialOverlayProps) {
  const [open, setOpen] = useState(!initialSeen);
  const [step, setStep] = useState(0);
  const titleId = useId();
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => dismissRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, step]);

  const dismiss = useCallback(() => {
    setOpen(false);
    void fetch("/api/onboarding/scan-tutorial", { method: "POST" }).catch(() => undefined);
    mcaLog.event("scan.tutorial.dismiss", {}, { componentName: "ScanTutorialOverlay", surfaceName: "scan" });
  }, []);

  if (!open) return null;

  const current = STEPS[step]!;
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-mca-base pointer-events-none">
      <Panel
        elevated
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto max-w-lg border border-mca-focus/30 bg-mca-surface-elevated/95 p-mca-lg shadow-mca-card transition-[opacity,box-shadow,transform] duration-200 ease-mca-standard"
      >
        <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Scan tutorial · {step + 1} / {STEPS.length}
        </p>
        <p id={titleId} className="mt-mca-sm text-mca-label font-semibold text-mca-accent/90">
          {current.title}
        </p>
        <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-muted">{current.body}</p>
        <div className="mt-mca-lg flex justify-end gap-mca-sm">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : null}
          {isLast ? (
            <Button ref={dismissRef} type="button" variant="primary" onClick={dismiss}>
              Got it
            </Button>
          ) : (
            <Button ref={dismissRef} type="button" variant="primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
