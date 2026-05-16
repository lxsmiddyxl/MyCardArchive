import { MARKETING_CRITICAL_CLASS } from "@/mca-utils/performance/criticalCss";
import { MarketingFeatures } from "@/mca-ui/marketing/MarketingFeatures";
import { MarketingFooter } from "@/mca-ui/marketing/MarketingFooter";
import { MarketingHero } from "@/mca-ui/marketing/MarketingHero";
import { MarketingScreenshots } from "@/mca-ui/marketing/MarketingScreenshots";

export function MarketingLanding() {
  return (
    <div className={`${MARKETING_CRITICAL_CLASS} -mx-mca-base space-y-mca-stage sm:-mx-mca-lg`}>
      <MarketingHero />
      <div className="mx-auto max-w-6xl space-y-mca-stage px-mca-base sm:px-0">
        <MarketingScreenshots />
        <MarketingFeatures />
        <MarketingFooter />
      </div>
    </div>
  );
}
