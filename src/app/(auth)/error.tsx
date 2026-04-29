"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function AuthSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Account screen error" surfaceName="auth" error={error} reset={reset} />
  );
}
