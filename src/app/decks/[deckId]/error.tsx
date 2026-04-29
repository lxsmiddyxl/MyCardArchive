"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function DeckEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Deck editor error" surfaceName="deck-editor" error={error} reset={reset} />
  );
}
