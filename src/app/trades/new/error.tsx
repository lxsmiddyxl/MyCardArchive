"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function NewTradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="New trade error" surfaceName="trades.new" error={error} reset={reset} />
  );
}
