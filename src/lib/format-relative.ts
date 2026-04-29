/**
 * Human-readable relative time (e.g. "3 days ago") using Intl.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const abs = Math.abs(diffSec);
  if (abs < 60) {
    return rtf.format(-diffSec, "second");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(-diffMin, "minute");
  }
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) {
    return rtf.format(-diffHr, "hour");
  }
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) {
    return rtf.format(-diffDay, "day");
  }
  const diffMo = Math.round(diffDay / 30);
  if (Math.abs(diffMo) < 12) {
    return rtf.format(-diffMo, "month");
  }
  const diffYr = Math.round(diffMo / 12);
  return rtf.format(-diffYr, "year");
}
