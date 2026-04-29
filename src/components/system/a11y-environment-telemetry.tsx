"use client";

import { useA11yEnvironmentTelemetry } from "@/lib/a11y/use-a11y-environment";

/** Mount once per app shell to record accessibility-related environment flags. */
export function A11yEnvironmentTelemetry() {
  useA11yEnvironmentTelemetry();
  return null;
}
