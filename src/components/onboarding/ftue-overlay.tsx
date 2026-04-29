"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  storageKey: string;
  title: string;
  children: ReactNode;
  surfaceName: string;
};

/**
 * First-time hint; dismissed state stored in `localStorage`.
 * Uses dialog semantics; focus moves to the primary control when opened.
 */
export function FtueOverlay({ storageKey, title, children, surfaceName }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const done = window.localStorage.getItem(storageKey);
      if (!done) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => dismissRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* private mode */
    }
    mcaLog.event("ftue.dismiss", { storageKey, surfaceName }, { componentName: "FtueOverlay", surfaceName });
    setOpen(false);
  }, [storageKey, surfaceName]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-mca-base pointer-events-none">
      <Panel
        elevated
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-live="polite"
        className="pointer-events-auto max-w-lg border border-mca-focus/30 bg-mca-surface-elevated/95 p-mca-lg shadow-mca-card transition-[opacity,box-shadow,transform] duration-200 ease-mca-standard motion-reduce:transition-none"
      >
        <p id={titleId} className="text-mca-label font-semibold uppercase tracking-wide text-mca-accent/90">
          {title}
        </p>
        <div className="mt-mca-sm text-sm leading-relaxed text-mca-ink-muted">{children}</div>
        <div className="mt-mca-lg flex justify-end">
          <Button ref={dismissRef} type="button" variant="primary" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </Panel>
    </div>
  );
}
