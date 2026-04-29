"use client";

import Link from "next/link";

type Action = {
  href: string;
  label: string;
  primary?: boolean;
};

type InvalidLinkCardProps = {
  title?: string;
  message?: string;
  actions?: Action[];
};

const DEFAULT_ACTIONS: Action[] = [
  { href: "/auth/confirm-signup", label: "Request a new link", primary: true },
  { href: "/auth/sign-in", label: "Back to sign in" },
];

export function InvalidLinkCard({
  title = "Invalid link",
  message = "Invalid or expired link. Request a new one.",
  actions = DEFAULT_ACTIONS,
}: InvalidLinkCardProps) {
  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">{title}</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-accent-deep dark:text-mca-accent">
        {message}
      </p>
      <div className="mt-mca-lg flex flex-col gap-mca-sm">
        {actions.map((action) => (
          <Link
            key={`${action.href}:${action.label}`}
            href={action.href}
            className={
              action.primary
                ? "w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90"
                : "w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated"
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
