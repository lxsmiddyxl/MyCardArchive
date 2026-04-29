"use client";

import type { McaLogContext } from "@/lib/logging/types";
import { useRef } from "react";

/**
 * Keeps latest {@link McaLogContext} for stable callbacks/effects without listing every
 * primitive field in dependency arrays (avoids churn when parents pass new object identity).
 */
export function useMcaContextRef(ctx: McaLogContext) {
  const ref = useRef(ctx);
  ref.current = ctx;
  return ref;
}
