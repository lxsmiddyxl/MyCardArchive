"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function TradesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Trades error" surfaceName="trades-list" error={error} reset={reset} />
  );
}
