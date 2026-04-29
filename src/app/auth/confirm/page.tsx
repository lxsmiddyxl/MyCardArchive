import Link from "next/link";

export default function AuthConfirmPlaceholderPage() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Email confirmation</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Confirm your email to finish account setup and continue to your collection.
      </p>
      <div className="mt-mca-lg flex flex-col gap-mca-sm">
        <Link
          href="/auth/confirm-signup"
          className="w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated"
        >
          Manage confirmation
        </Link>
        <Link
          href="/auth/sign-in"
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
