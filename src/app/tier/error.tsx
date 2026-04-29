"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function TierError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Tier error" surfaceName="tier" error={error} reset={reset} />
  );
}
