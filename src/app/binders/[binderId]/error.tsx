"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function BinderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Binder error" surfaceName="binder-detail" error={error} reset={reset} />
  );
}
