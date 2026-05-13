"use client";

import { cn } from "@/lib/ui/cn";
import { useEffect, useState } from "react";

/**
 * Thin strip when `navigator.onLine` is false so fetchers can show consistent copy.
 */
export function OfflineNoticeStrip() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-mca-warning-surface-border/50 bg-mca-warning-surface/30 px-mca-base py-mca-xs text-center text-mca-caption font-medium text-mca-warning-tint"
      )}
    >
      You&apos;re offline — reconnect to sync binders, decks, and trades.
    </div>
  );
}
