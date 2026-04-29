"use client";

import { Button } from "@/mca-ui/button";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCta() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    mcaLog.event(
      "pwa.install",
      { outcome: choice.outcome },
      { componentName: "InstallAppCta", surfaceName: "pwa" }
    );
  }, [deferred]);

  if (dismissed || !deferred) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[150] max-w-sm rounded-mca-block border border-mca-accent-strong/40 bg-mca-surface-elevated/95 p-mca-md shadow-mca-card backdrop-blur-sm md:bottom-6 md:right-6">
      <p className="text-sm font-medium text-mca-ink-strong">Install MyCardArchive</p>
      <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
        Add to your home screen for faster access to binders and decks offline.
      </p>
      <div className="mt-mca-md flex flex-wrap gap-mca-sm">
        <Button type="button" onClick={() => void onInstall()}>
          Install
        </Button>
        <Button type="button" variant="tertiary" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
