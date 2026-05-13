"use client";

import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { ReactNode } from "react";

/**
 * Phase 33: wraps primary client-rendered app chrome so rendering errors never blank the whole shell.
 */
export function RootClientBoundary({ children }: { children: ReactNode }) {
  return (
    <MCAErrorBoundary componentName="RootClientBoundary" surfaceName="app">
      {children}
    </MCAErrorBoundary>
  );
}
