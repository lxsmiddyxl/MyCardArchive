/**
 * Seasonal event catalog (UTC windows).
 * Keep date ranges in sync with `supabase/migrations/076_seasonal_events.sql` (`record_seasonal_event_participation`).
 */

export type SeasonalEventDef = {
  eventId: string;
  displayName: string;
  description: string;
  /** Inclusive start (UTC). */
  startDate: string;
  /** Exclusive end (UTC). */
  endDate: string;
  badgeKey: string;
  flairKey?: string;
  /** Short copy for scan page banner. */
  bannerScanCta: string;
  /** Short copy for tier / plans banner. */
  bannerTierCta: string;
};

export const SEASONAL_EVENTS: SeasonalEventDef[] = [
  {
    eventId: "spring_2026",
    displayName: "Spring 2026 Collector",
    description:
      "Limited-time spring event — join the community and keep scanning to earn this seasonal badge.",
    startDate: "2026-03-01T00:00:00.000Z",
    endDate: "2026-06-01T00:00:00.000Z",
    badgeKey: "spring_2026_collector",
    flairKey: "spring_2026_event",
    bannerScanCta: "Earn the limited badge by scanning cards or joining community activity.",
    bannerTierCta: "Plans stay the same — jump in during the event to earn the limited badge.",
  },
  {
    eventId: "summer_scan_2026",
    displayName: "Summer Scan Sprint 2026",
    description: "Summer sprint for trainers who love the scan flow — rack up scans while the event is live.",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-09-01T00:00:00.000Z",
    badgeKey: "summer_2026_scan_sprint",
    flairKey: "summer_2026_scan_event",
    bannerScanCta: "Summer sprint is live — scans and community actions count toward the badge.",
    bannerTierCta: "Summer sprint is live — upgrade or renew anytime; the badge is earned in-app.",
  },
  {
    eventId: "holiday_2026",
    displayName: "Holiday Collector 2026",
    description: "Year-end collector moment — celebrate the hobby with a limited holiday badge.",
    startDate: "2026-12-01T00:00:00.000Z",
    endDate: "2027-01-08T00:00:00.000Z",
    badgeKey: "holiday_2026_collector",
    flairKey: "holiday_2026_event",
    bannerScanCta: "Holiday event is live — scan, post, comment, or like to earn the limited badge.",
    bannerTierCta: "Holiday event is live — earn the limited badge with scans and community activity.",
  },
];

const BY_EVENT_ID = new Map(SEASONAL_EVENTS.map((e) => [e.eventId, e]));
const BY_BADGE_KEY = new Map(SEASONAL_EVENTS.map((e) => [e.badgeKey, e]));

export function parseUtc(iso: string): number {
  return Date.parse(iso);
}

export function isEventActiveNow(event: SeasonalEventDef, nowMs: number = Date.now()): boolean {
  const t0 = parseUtc(event.startDate);
  const t1 = parseUtc(event.endDate);
  return nowMs >= t0 && nowMs < t1;
}

export function listActiveSeasonalEvents(nowMs: number = Date.now()): SeasonalEventDef[] {
  return SEASONAL_EVENTS.filter((e) => isEventActiveNow(e, nowMs));
}

export function getSeasonalEventById(eventId: string): SeasonalEventDef | undefined {
  return BY_EVENT_ID.get(eventId);
}

export function getSeasonalEventByBadgeKey(badgeKey: string): SeasonalEventDef | undefined {
  return BY_BADGE_KEY.get(badgeKey);
}

/** Flair keys granted alongside seasonal badges (for profile / enrichment). */
export function flairKeysFromSeasonalBadgeKeys(badgeKeys: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of badgeKeys) {
    const ev = getSeasonalEventByBadgeKey(k);
    const fk = ev?.flairKey?.trim();
    if (fk && !seen.has(fk)) {
      seen.add(fk);
      out.push(fk);
    }
  }
  return out;
}

/** Pick one “top” seasonal flair for inline UI (holiday > summer > spring). */
export function pickTopSeasonalFlairKeyFromBadgeKeys(badgeKeys: string[]): string | null {
  const rank = (k: string) => {
    if (k === "holiday_2026_collector") return 3;
    if (k === "summer_2026_scan_sprint") return 2;
    if (k === "spring_2026_collector") return 1;
    return 0;
  };
  let best: string | null = null;
  let bestR = -1;
  for (const bk of badgeKeys) {
    const r = rank(bk);
    if (r > bestR) {
      bestR = r;
      best = bk;
    }
  }
  if (!best) return null;
  return getSeasonalEventByBadgeKey(best)?.flairKey?.trim() ?? null;
}

const SEASONAL_FLAIR_KEY_SET = new Set(
  SEASONAL_EVENTS.map((e) => e.flairKey).filter((x): x is string => Boolean(x?.trim()))
);

export function isSeasonalFlairKey(key: string): boolean {
  return SEASONAL_FLAIR_KEY_SET.has(key.trim());
}

export function listActiveSeasonalBannerLines(
  surface: "scan" | "tier",
  nowMs: number = Date.now()
): string[] {
  const active = listActiveSeasonalEvents(nowMs);
  return active.map((e) => {
    const cta = surface === "scan" ? e.bannerScanCta : e.bannerTierCta;
    return `${e.displayName} is live! ${cta}`;
  });
}
