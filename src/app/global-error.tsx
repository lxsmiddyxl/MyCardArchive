"use client";

import { AppErrorFallback } from "@/components/app-error-fallback";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const loggedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${error.digest ?? ""}:${error.message}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    mcaLog.error(
      "global.fatal",
      { message: error.message, digest: error.digest },
      { componentName: "GlobalError", surfaceName: "root" }
    );
  }, [error.digest, error.message]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-mca-surface px-mca-base py-mca-2xl text-mca-ink-strong antialiased">
        <div className="flex min-h-screen items-center justify-center">
          <AppErrorFallback
            title="Application error"
            message={error.message || "A critical error occurred."}
            reset={reset}
          />
        </div>
      </body>
    </html>
  );
}
