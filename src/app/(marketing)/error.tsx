"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function MarketingSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError
      title="Could not load this page"
      surfaceName="marketing"
      error={error}
      reset={reset}
    />
  );
}
