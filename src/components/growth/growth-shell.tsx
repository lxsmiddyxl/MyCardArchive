"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { getClientRegionLabel } from "@/lib/regions/public-region";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

const ANNOUNCEMENT_ID = "mca:announcement:2026-04-phase50";
const NPS_KEY = "mca:nps:dismissed:matching";

function loadDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function saveDismiss(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* */
  }
}

export function GrowthShell() {
  const pathname = usePathname();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [npsDismissed, setNpsDismissed] = useState(true);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const feedbackTitleId = useId();

  useEffect(() => {
    if (loadDismissed(ANNOUNCEMENT_ID)) return;
    setShowAnnouncement(true);
    mcaLog.event(
      "announcement.view",
      { id: ANNOUNCEMENT_ID, region: getClientRegionLabel() },
      { componentName: "GrowthShell", surfaceName: "growth" }
    );
  }, []);

  useEffect(() => {
    if (pathname !== "/matching") return;
    setNpsDismissed(loadDismissed(NPS_KEY));
  }, [pathname]);

  const dismissAnnouncement = useCallback(() => {
    saveDismiss(ANNOUNCEMENT_ID);
    setShowAnnouncement(false);
    mcaLog.event(
      "announcement.dismiss",
      { id: ANNOUNCEMENT_ID },
      { componentName: "GrowthShell", surfaceName: "growth" }
    );
  }, []);

  const submitFeedback = useCallback(async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) return;
    setFeedbackBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, feature: "general" }),
      });
      if (res.ok) {
        setFeedbackOpen(false);
        setFeedbackText("");
      }
    } finally {
      setFeedbackBusy(false);
    }
  }, [feedbackText]);

  const submitNps = useCallback(() => {
    if (npsScore == null) return;
    saveDismiss(NPS_KEY);
    setNpsDismissed(true);
    mcaLog.event(
      "growth.nps.submit",
      { feature: "matching", score: npsScore },
      { componentName: "GrowthShell", surfaceName: "growth" }
    );
  }, [npsScore]);

  const dismissNps = useCallback(() => {
    saveDismiss(NPS_KEY);
    setNpsDismissed(true);
  }, []);

  return (
    <>
      {showAnnouncement ? (
        <div className="fixed bottom-4 left-1/2 z-[55] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2">
          <Panel
            elevated
            role="dialog"
            aria-modal="false"
            aria-labelledby="growth-announcement-title"
            className="border border-mca-accent-strong/25 bg-mca-surface-elevated/95 p-mca-md shadow-mca-card transition-[opacity,transform] duration-200 ease-mca-standard motion-reduce:transition-none"
          >
            <p id="growth-announcement-title" className="text-sm font-semibold text-mca-ink-strong">
              What&apos;s new
            </p>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Grading pipeline is model-ready, matching has richer scores, and presence shows who’s browsing with
              you. See docs for operators.
            </p>
            <div className="mt-mca-md flex justify-end gap-mca-sm">
              <Button type="button" variant="tertiary" onClick={dismissAnnouncement}>
                Dismiss
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 z-[54] flex flex-col items-end gap-mca-sm">
        <Button type="button" variant="secondary" onClick={() => setFeedbackOpen(true)}>
          Feedback
        </Button>
      </div>

      {feedbackOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-mca-md sm:items-center">
          <Panel
            elevated
            role="dialog"
            aria-modal="true"
            aria-labelledby={feedbackTitleId}
            className="max-h-[min(80vh,520px)] w-full max-w-md overflow-hidden border border-mca-border bg-mca-surface-elevated p-mca-lg shadow-mca-card"
          >
            <h2 id={feedbackTitleId} className="text-lg font-semibold text-mca-ink-strong">
              Send feedback
            </h2>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Tell us what to improve. Signed-in users only; no card data is sent automatically.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
              className="mt-mca-md w-full rounded-mca-card border border-mca-field-border bg-mca-surface-elevated px-mca-base py-mca-sm text-sm text-mca-ink-body"
              placeholder="Your thoughts…"
            />
            <div className="mt-mca-md flex justify-end gap-mca-sm">
              <Button type="button" variant="tertiary" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={feedbackBusy || !feedbackText.trim()}
                onClick={() => void submitFeedback()}
              >
                {feedbackBusy ? "Sending…" : "Submit"}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {pathname === "/matching" && !npsDismissed ? (
        <div className="fixed bottom-20 right-4 z-[53] w-[min(20rem,calc(100vw-2rem))]">
          <Panel className="border border-mca-border bg-mca-surface-elevated/95 p-mca-md shadow-mca-panel">
            <p className="text-sm font-medium text-mca-ink-soft">How was matching?</p>
            <div className="mt-mca-sm flex flex-wrap gap-mca-xs">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNpsScore(n)}
                  className={`h-9 w-9 rounded-mca-control border text-sm font-semibold transition duration-200 ease-mca-standard ${
                    npsScore === n
                      ? "border-mca-accent-strong bg-mca-accent-strong/20 text-mca-ink-strong"
                      : "border-mca-field-border bg-mca-chrome text-mca-ink-muted hover:bg-mca-border-subtle"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-mca-md flex justify-end gap-mca-sm">
              <Button type="button" variant="tertiary" onClick={dismissNps}>
                Skip
              </Button>
              <Button type="button" variant="primary" disabled={npsScore == null} onClick={submitNps}>
                Send
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
