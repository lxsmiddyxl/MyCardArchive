import Image from "next/image";
import Link from "next/link";

export function LaunchPageContent() {
  return (
    <article className="mx-auto max-w-3xl space-y-mca-xl px-mca-base py-mca-2xl">
      <header className="space-y-mca-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mca-accent/90">
          Launch · Wave 1
        </p>
        <h1 className="text-3xl font-bold text-mca-ink-strong sm:text-4xl">
          What&apos;s new in MyCardArchive
        </h1>
        <p className="text-mca-ink-muted">
          The collector portfolio for Pokémon TCG — organize cards, scan into your collection, and
          share binders with the community.
        </p>
      </header>

      <div className="relative mx-auto aspect-[1200/630] max-w-2xl overflow-hidden rounded-mca-sheet border border-mca-border">
        <Image
          src="/launch/og-launch.svg"
          alt="MyCardArchive launch"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
      </div>

      <section className="space-y-mca-md">
        <h2 className="text-xl font-semibold text-mca-ink-strong">Highlights</h2>
        <ul className="list-inside list-disc space-y-mca-sm text-mca-ink-muted">
          <li>Digital binders with drag-and-drop pages and public share links</li>
          <li>Intelligent card scanning with catalog auto-match</li>
          <li>Collector profiles, showcases, and embeddable binders</li>
          <li>Early access via invite codes for wave 1</li>
        </ul>
      </section>

      <div className="flex flex-wrap justify-center gap-mca-compact">
        <Link
          href="/auth/sign-up"
          className="inline-flex min-h-[2.75rem] items-center rounded-mca-control bg-mca-accent-strong/90 px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent"
        >
          Create account
        </Link>
        <Link
          href="/features/binders"
          className="inline-flex min-h-[2.75rem] items-center rounded-mca-control border border-mca-field-border px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60"
        >
          Explore features
        </Link>
      </div>
    </article>
  );
}
