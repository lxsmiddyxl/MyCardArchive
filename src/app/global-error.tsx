"use client";

import { AppErrorFallback } from "@/components/app-error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
