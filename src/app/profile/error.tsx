"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Profile error" surfaceName="profile" error={error} reset={reset} />
  );
}
