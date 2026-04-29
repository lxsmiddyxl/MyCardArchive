"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { cn } from "@/lib/ui/cn";

/**
 * Non-blocking strip when the device is offline. Pair with cached reads / retry on reconnect.
 */
export function OfflineNotice({ className }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-mca-accent-strong/30 bg-mca-warning-surface/30 px-mca-base py-mca-sm text-center text-mca-caption text-mca-warning-tint",
        className
      )}
    >
      You&apos;re offline. Showing cached content where available; actions may queue until you reconnect.
    </div>
  );
}
