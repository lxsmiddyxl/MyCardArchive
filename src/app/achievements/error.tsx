"use client";

import { LoggedRouteError } from "@/components/logged-route-error";

export default function AchievementsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoggedRouteError title="Achievements error" surfaceName="achievements" error={error} reset={reset} />
  );
}
