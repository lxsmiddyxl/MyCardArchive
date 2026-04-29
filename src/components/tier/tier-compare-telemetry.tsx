"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { useEffect } from "react";

const TEL = { componentName: "TierCompareFeatureTable", surfaceName: "tier" } as const;

export function TierCompareMount({ currentSlug }: { currentSlug: string }) {
  useEffect(() => {
    mcaLog.event("tier.compare.view", { currentSlug }, TEL);
  }, [currentSlug]);
  return null;
}
