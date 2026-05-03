import Link from "next/link";

/**
 * Public launch footer — legal, support, and policy links. Safe for SSR (no client state).
 */
export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-mca-border/80 bg-mca-surface/80 px-mca-base py-mca-lg pb-[max(1rem,env(safe-area-inset-bottom))] text-mca-caption text-mca-ink-subtle"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-mca-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="max-w-prose text-balance leading-relaxed">
          MyCardArchive — organize Pokémon TCG binders, decks, scans, and trades.
        </p>
        <nav aria-label="Legal and help" className="flex flex-wrap gap-x-mca-lg gap-y-mca-sm">
          <Link
            href="/support"
            className="font-medium text-mca-ink-muted underline-offset-2 transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong hover:underline"
          >
            Support
          </Link>
          <Link
            href="/legal/terms"
            className="font-medium text-mca-ink-muted underline-offset-2 transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/legal/privacy"
            className="font-medium text-mca-ink-muted underline-offset-2 transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong hover:underline"
          >
            Privacy
          </Link>
          <Link
            href="/welcome"
            className="font-medium text-mca-ink-muted underline-offset-2 transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong hover:underline"
          >
            Getting started
          </Link>
        </nav>
      </div>
    </footer>
  );
}
