import { MARKETING_FEATURE_IMAGE_SIZES } from "@/mca-utils/performance/optimizeImages";
import type { FeaturePageConfig } from "@/mca-ui/marketing/marketing-content";
import Image from "next/image";
import Link from "next/link";

export type FeaturePageLayoutProps = {
  config: FeaturePageConfig;
};

export function FeaturePageLayout({ config }: FeaturePageLayoutProps) {
  return (
    <article className="space-y-mca-stage">
      <header className="rounded-mca-sheet border border-mca-border-subtle/80 bg-gradient-to-br from-mca-accent-border/10 to-mca-surface px-mca-lg py-mca-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mca-accent/90">Feature</p>
        <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          {config.headline}
        </h1>
        <p className="mt-mca-md max-w-2xl text-base leading-relaxed text-mca-ink-muted">
          {config.description}
        </p>
        <Link
          href="/auth/sign-up"
          className="mt-mca-lg inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-on-accent transition duration-200 ease-mca-standard hover:bg-mca-accent"
        >
          Create your archive
        </Link>
      </header>

      <div className="grid gap-mca-xl lg:grid-cols-2 lg:items-start">
        <ul className="space-y-mca-md">
          {config.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-mca-sm rounded-mca-card border border-mca-border-subtle/60 bg-mca-surface-elevated/30 px-mca-md py-mca-compact text-sm text-mca-ink-body"
            >
              <span className="text-mca-accent" aria-hidden>
                ✓
              </span>
              {bullet}
            </li>
          ))}
        </ul>
        <Image
          src={config.imageSrc}
          alt=""
          width={560}
          height={320}
          sizes={MARKETING_FEATURE_IMAGE_SIZES}
          className="w-full rounded-mca-card border border-mca-border-subtle/80"
        />
      </div>
    </article>
  );
}
