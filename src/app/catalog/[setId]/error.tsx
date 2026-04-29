"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function CatalogSetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Set catalog error" surfaceName="catalog-set" error={error} reset={reset} />
  );
}
