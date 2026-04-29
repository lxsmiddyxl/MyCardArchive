import Link from "next/link";

export default function PublicDeckNotFound() {
  return (
    <div className="mca-section-reveal py-mca-stage text-center">
      <h1 className="text-2xl font-semibold text-mca-surface-elevated dark:text-mca-ink-strong">
        Deck not found
      </h1>
      <p className="mt-mca-sm text-sm text-mca-hint dark:text-mca-ink-muted">
        This link may be invalid or the deck was removed.
      </p>
      <Link
        href="/"
        className="mt-mca-lg inline-block text-sm font-medium text-mca-accent-deep underline-offset-2 hover:underline dark:text-mca-accent"
      >
        Back to MyCardArchive
      </Link>
    </div>
  );
}
