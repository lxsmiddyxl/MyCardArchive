"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function MatchingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Matching error" surfaceName="matching" error={error} reset={reset} />
  );
}
