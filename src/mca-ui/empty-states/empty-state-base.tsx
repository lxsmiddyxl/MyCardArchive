import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export type EmptyStateBaseProps = {
  illustrationSrc: string;
  title: string;
  description: string;
  primaryAction?: { href: string; label: string };
  secondaryMessage?: ReactNode;
};

export function EmptyStateBase({
  illustrationSrc,
  title,
  description,
  primaryAction,
  secondaryMessage,
}: EmptyStateBaseProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-stage text-center"
      role="region"
      aria-label={title}
    >
      <Image
        src={illustrationSrc}
        alt=""
        width={320}
        height={176}
        className="mb-mca-lg opacity-90"
        priority={false}
      />
      <p className="text-lg font-medium text-mca-ink-soft">{title}</p>
      <p className="mt-mca-sm max-w-md text-sm leading-relaxed text-mca-ink-subtle">{description}</p>
      {secondaryMessage ? (
        <div className="mt-mca-lg max-w-md text-sm text-mca-nav-accent/90">{secondaryMessage}</div>
      ) : null}
      {primaryAction ? (
        <Link
          href={primaryAction.href}
          className="mt-mca-xl inline-flex items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition duration-200 ease-mca-standard hover:bg-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
        >
          {primaryAction.label}
        </Link>
      ) : null}
    </div>
  );
}
