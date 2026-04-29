import { ArtworkWarmLanding } from "@/components/marketing/artwork-warm-landing";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ArtworkWarmLanding />
      {children}
    </>
  );
}
