"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function DecksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Decks error" surfaceName="decks-list" error={error} reset={reset} />
  );
}
