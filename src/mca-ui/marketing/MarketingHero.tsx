import { MARKETING_HERO_IMAGE_SIZES } from "@/mca-utils/performance/optimizeImages";
import Image from "next/image";
import Link from "next/link";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden rounded-mca-sheet border border-mca-border-subtle/80 bg-gradient-to-b from-mca-accent-border/10 via-mca-surface to-mca-surface px-mca-lg py-mca-stage sm:px-mca-xl">
      <div className="mx-auto grid max-w-6xl gap-mca-xl lg:grid-cols-2 lg:items-center">
        <div className="space-y-mca-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mca-accent/90">
            Pokémon TCG collectors
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-mca-ink-strong sm:text-5xl">
            Your cards. Organized. Shared. Scanned.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-mca-ink-muted">
            MyCardArchive is the collector portfolio for Pokémon TCG—binders, intelligent scanning,
            social profiles, and shareable showcases in one place.
          </p>
          <div className="flex flex-wrap gap-mca-compact">
            <Link
              href="/auth/sign-up"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition duration-200 ease-mca-standard hover:bg-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
            >
              Start free
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
            >
              Sign in
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <Image
            src="/marketing/home-hero.svg"
            alt=""
            width={640}
            height={360}
            priority
            sizes={MARKETING_HERO_IMAGE_SIZES}
            className="w-full drop-shadow-mca-card"
          />
        </div>
      </div>
    </section>
  );
}
