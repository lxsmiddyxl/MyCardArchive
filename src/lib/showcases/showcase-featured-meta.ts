/** Machine-readable first line for “featured” showcase (no DB migration). Public APIs strip this. */
export const SHOWCASE_FEATURED_PREFIX = "MCA_META:featured=1\n";

export function stripShowcaseMachineLines(description: string | null): string | null {
  if (description == null) return null;
  const without = description.replace(/^\s*MCA_META:featured=1\s*\r?\n/i, "").trimEnd();
  return without.length > 0 ? without : null;
}

export function isShowcaseFeaturedFromDescription(description: string | null): boolean {
  return /^\s*MCA_META:featured=1\s*\r?\n/i.test(description ?? "");
}

/** Prepend featured marker; strips any previous marker first. */
export function withShowcaseFeaturedDescription(description: string | null, featured: boolean): string | null {
  const base = stripShowcaseMachineLines(description);
  if (!featured) return base;
  const tail = base && base.length > 0 ? base : "";
  return `${SHOWCASE_FEATURED_PREFIX}${tail}`;
}
