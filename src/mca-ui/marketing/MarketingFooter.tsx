import { GITHUB_REPO_URL } from "@/mca-ui/marketing/marketing-content";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer
      className="mt-mca-stage rounded-mca-card border border-mca-border-subtle/60 bg-mca-surface-elevated/30 px-mca-lg py-mca-xl"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl space-y-mca-lg">
        <section aria-labelledby="marketing-testimonials-heading">
          <h2 id="marketing-testimonials-heading" className="text-center text-lg font-semibold text-mca-ink-body">
            Collectors are building with MCA
          </h2>
          <div className="mt-mca-lg grid gap-mca-md md:grid-cols-3">
            {[
              {
                quote: "Finally a binder that tracks set progress the way I think about my collection.",
                author: "Early beta collector",
              },
              {
                quote: "Scanning bulk pulls into a trade binder saved me hours.",
                author: "Local league trader",
              },
              {
                quote: "Sharing my showcase binders got my friends to sign up.",
                author: "Profile showcase user",
              },
            ].map((t) => (
              <blockquote
                key={t.author}
                className="rounded-mca-card border border-mca-border-subtle/50 bg-mca-chrome/20 p-mca-md text-sm"
              >
                <p className="leading-relaxed text-mca-ink-muted">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-mca-sm text-mca-caption text-mca-ink-subtle">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <nav
          aria-label="Marketing links"
          className="flex flex-wrap items-center justify-center gap-x-mca-lg gap-y-mca-sm text-sm"
        >
          <Link href="/features/scanning" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Scanning
          </Link>
          <Link href="/features/binders" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Binders
          </Link>
          <Link href="/features/social" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Social
          </Link>
          <Link href="/features/portfolio" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Portfolio
          </Link>
          <Link href="/legal/privacy" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Privacy
          </Link>
          <Link href="/legal/terms" className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline">
            Terms
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mca-ink-muted hover:text-mca-accent-strong/90 hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
