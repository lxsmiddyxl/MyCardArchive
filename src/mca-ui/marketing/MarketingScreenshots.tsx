import { MARKETING_FEATURE_IMAGE_SIZES } from "@/mca-utils/performance/optimizeImages";
import Image from "next/image";

const SHOTS = [
  {
    label: "Binder shelf",
    caption: "Organize sets and trades in digital binders.",
    src: "/marketing/binder-feature.svg",
  },
  {
    label: "Scan flow",
    caption: "Add cards from your camera with catalog matching.",
    src: "/marketing/scan-feature.svg",
  },
  {
    label: "Collector profile",
    caption: "Showcase binders and stats on your public profile.",
    src: "/marketing/dashboard-hero.svg",
  },
] as const;

export function MarketingScreenshots() {
  return (
    <section className="space-y-mca-lg" aria-labelledby="marketing-screenshots-heading">
      <div className="text-center">
        <h2 id="marketing-screenshots-heading" className="text-2xl font-semibold text-mca-ink-strong">
          See it in action
        </h2>
        <p className="mt-mca-sm text-mca-ink-muted">A collector workflow that stays out of your way.</p>
      </div>
      <div className="grid gap-mca-lg md:grid-cols-3">
        {SHOTS.map((shot) => (
          <figure
            key={shot.label}
            className="overflow-hidden rounded-mca-card border border-mca-border-subtle/80 bg-mca-chrome/20 p-mca-md"
          >
            <Image
              src={shot.src}
              alt=""
              width={400}
              height={220}
              sizes={MARKETING_FEATURE_IMAGE_SIZES}
              className="w-full"
            />
            <figcaption className="mt-mca-md space-y-mca-xs">
              <p className="text-sm font-semibold text-mca-ink-body">{shot.label}</p>
              <p className="text-sm text-mca-ink-muted">{shot.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
