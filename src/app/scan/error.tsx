"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function ScanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Scan error" surfaceName="scan" error={error} reset={reset} />
  );
}
