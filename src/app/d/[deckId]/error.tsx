"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function PublicDeckError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Shared deck error" surfaceName="public-deck" error={error} reset={reset} />
  );
}
