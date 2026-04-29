"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function TradeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Trade error" surfaceName="trade-detail" error={error} reset={reset} />
  );
}
