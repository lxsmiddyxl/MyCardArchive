import Link from "next/link";
import { FEATURE_PAGES } from "@/mca-ui/marketing/marketing-content";

const LANDING_FEATURES = [
  {
    title: "Intelligent Scanning",
    description: "Identify cards from photos and add them to binders with confidence hints.",
    href: "/features/scanning",
  },
  {
    title: "Binder Engine",
    description: "Paginated binders with set progress, missing lists, and public share links.",
    href: "/features/binders",
  },
  {
    title: "Social Layer",
    description: "Follow collectors, subscribe to binders, and explore shared shelves.",
    href: "/features/social",
  },
  {
    title: "Portfolio System",
    description: "Collections, themed groups, and profile showcases for your best binders.",
    href: "/features/portfolio",
  },
] as const;

export function MarketingFeatures() {
  return (
    <section className="space-y-mca-lg" aria-labelledby="marketing-features-heading">
      <div className="text-center">
        <h2 id="marketing-features-heading" className="text-2xl font-semibold text-mca-ink-strong">
          Built for serious collectors
        </h2>
        <p className="mt-mca-sm text-mca-ink-muted">Everything you need from first card to showcase.</p>
      </div>
      <div className="grid gap-mca-lg sm:grid-cols-2">
        {LANDING_FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface-elevated/40 p-mca-lg transition duration-200 ease-mca-standard hover:border-mca-accent-border/40 hover:bg-mca-chrome/30"
          >
            <h3 className="text-lg font-semibold text-mca-ink-body">{f.title}</h3>
            <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-muted">{f.description}</p>
            <span className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
      <p className="sr-only">Feature pages: {FEATURE_PAGES.map((p) => p.title).join(", ")}</p>
    </section>
  );
}
