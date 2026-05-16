"use client";

import Link from "next/link";
import { useState } from "react";

const DISMISS_KEY = "mca_launch_banner_dismissed";

export function LaunchBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Launch announcement"
      className="border-b border-mca-accent-border/40 bg-gradient-to-r from-mca-accent-border/15 via-mca-surface-elevated to-mca-surface px-mca-base py-mca-sm text-center text-mca-sm sm:px-mca-lg"
    >
      <p className="text-mca-ink-muted">
        <span className="font-semibold text-mca-ink-strong">MyCardArchive is live.</span>{" "}
        Digital binders, scans, and collector profiles —{" "}
        <Link href="/launch" className="font-medium text-mca-accent underline-offset-2 hover:underline">
          See what&apos;s new
        </Link>
        {" · "}
        <Link href="/invite" className="font-medium text-mca-accent underline-offset-2 hover:underline">
          Have an invite?
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="mt-mca-micro text-xs text-mca-ink-subtle underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
