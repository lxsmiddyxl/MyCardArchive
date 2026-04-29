"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Activity error" surfaceName="activity" error={error} reset={reset} />
  );
}
