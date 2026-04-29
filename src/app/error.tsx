"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Page error" surfaceName="root" error={error} reset={reset} />
  );
}
