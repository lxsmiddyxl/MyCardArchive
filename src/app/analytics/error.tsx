"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Analytics error" surfaceName="analytics" error={error} reset={reset} />
  );
}
