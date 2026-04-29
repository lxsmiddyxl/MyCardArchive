"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function CatalogCardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Card catalog error" surfaceName="catalog-card" error={error} reset={reset} />
  );
}
