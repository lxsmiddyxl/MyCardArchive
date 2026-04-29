import { cn } from "@/lib/ui/cn";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Accessible trail: last item is current page (`aria-current="page"`).
 */
export function Breadcrumb({ items, className }: Props) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-mca-caption text-mca-ink-subtle", className)}>
      <ol className="flex flex-wrap items-center gap-mca-xs">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-mca-xs">
              {i > 0 ? (
                <span className="text-mca-hint" aria-hidden>
                  /
                </span>
              ) : null}
              {last || !item.href ? (
                <span
                  className={last ? "font-medium text-mca-ink-body" : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-mca-ink-muted transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong/90 focus-visible:rounded-mca-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
