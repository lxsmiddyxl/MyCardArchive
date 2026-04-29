"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function BinderCreateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError
      title="Create binder error"
      surfaceName="binder-create"
      error={error}
      reset={reset}
    />
  );
}
