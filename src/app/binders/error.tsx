"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function BindersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Binders error" surfaceName="binders-list" error={error} reset={reset} />
  );
}
