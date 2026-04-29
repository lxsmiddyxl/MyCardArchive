"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Catalog error" surfaceName="catalog" error={error} reset={reset} />
  );
}
