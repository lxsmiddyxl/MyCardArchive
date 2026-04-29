"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function CardsViewerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError
      title="Collection error"
      surfaceName="cards-inventory"
      error={error}
      reset={reset}
    />
  );
}
