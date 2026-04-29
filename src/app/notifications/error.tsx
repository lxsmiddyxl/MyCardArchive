"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError
      title="Notifications error"
      surfaceName="notifications"
      error={error}
      reset={reset}
    />
  );
}
