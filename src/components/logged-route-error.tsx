"use client";

import { AppErrorFallback } from "@/components/app-error-fallback";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useEffect } from "react";

type Props = {
  title: string;
  /** Identifies the segment in `mcaLog` (e.g. `matching`, `notifications`). */
  surfaceName: string;
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * App Router `error.tsx` shell: logs once per error via Phase 46 `mcaLog`, then shows {@link AppErrorFallback}.
 */
export function LoggedRouteError({ title, surfaceName, error, reset }: Props) {
  useEffect(() => {
    mcaLog.error(
      "route.segment.error",
      { message: error.message, digest: error.digest },
      { componentName: "route-error", surfaceName }
    );
  }, [error.message, error.digest, surfaceName]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-mca-base py-mca-2xl transition-opacity duration-200 ease-mca-standard">
      <AppErrorFallback title={title} message={error.message || "Something went wrong."} reset={reset} />
    </div>
  );
}
