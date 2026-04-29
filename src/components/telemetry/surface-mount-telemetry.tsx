"use client";

import { useSuspenseProfile } from "@/lib/telemetry/use-suspense-profile";
import { useMemo } from "react";

type Props = {
  /** Event key prefix for `useSuspenseProfile`. */
  name: string;
  /** Segment name in `McaLogContext.surfaceName`. */
  surfaceName: string;
};

/**
 * Mount-only telemetry for server-rendered pages that wrap content in a client subtree.
 * Emits suspense/waterfall timing for the surface when applicable.
 */
export function SurfaceMountTelemetry({ name, surfaceName }: Props) {
  const ctx = useMemo(
    () => ({
      componentName: name,
      surfaceName,
    }),
    [name, surfaceName]
  );
  useSuspenseProfile(name, ctx);
  return null;
}
