import Link from "next/link";

export const metadata = {
  title: "Beta",
  description: "MyCardArchive beta — welcome early collectors.",
};

export default function BetaLandingPage() {
  return (
    <div className="space-y-mca-xl pt-mca-sm">
      <header className="space-y-mca-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-accent/90">Beta</p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Welcome to the MyCardArchive beta
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-mca-ink-muted">
          You&apos;re early. Organize Pokémon cards in binders and decks, scan photos into your
          collection, trade with partners, and match on haves and wants—limits follow your plan tier.
        </p>
      </header>

      <section className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel dark:border-mca-border-subtle">
        <h2 className="text-sm font-semibold text-mca-ink-strong">Suggested first steps</h2>
        <ol className="mt-mca-md list-inside list-decimal space-y-mca-sm text-sm text-mca-ink-muted">
          <li>Create a binder and add a few cards.</li>
          <li>Build a deck from your catalog.</li>
          <li>Open Matching to see trade partners.</li>
          <li>Try Scan when you have a clear photo of a card.</li>
        </ol>
        <div className="mt-mca-lg flex flex-wrap gap-mca-sm">
          <Link
            href="/feed"
            className="inline-flex items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
          >
            Go to feed
          </Link>
          <Link
            href="/tier"
            className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
          >
            View your plan
          </Link>
        </div>
      </section>

      <p className="text-mca-caption text-mca-hint">
        Feedback helps us ship faster. Use{" "}
        <Link href="/support" className="text-mca-accent-strong/90 underline-offset-2 hover:underline">
          Report an issue
        </Link>{" "}
        from any session.
      </p>
    </div>
  );
}
