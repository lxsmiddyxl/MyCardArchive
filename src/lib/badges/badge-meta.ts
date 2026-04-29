import type { UserBadgeRow } from "@/lib/badges/types";

export type BadgeCategory =
  | "tier"
  | "tenure"
  | "scan_milestone"
  | "seasonal_event"
  | "journey"
  | "collection_mastery"
  | "trade_reputation"
  | "play_identity"
  | "collection_value"
  | "fandom";

export type BadgeMeta = {
  badge_type: string;
  badge_key: string;
  category: BadgeCategory;
  displayName: string;
  description: string;
  /** Optional compact label (e.g. "500" for milestones). */
  shortLabel?: string;
  /** Tier emblem only; tier_slug for TierEmblem. */
  tierSlugForEmblem?: string;
};

const META: BadgeMeta[] = [
  {
    badge_type: "tier",
    badge_key: "free",
    category: "tier",
    displayName: "Free",
    description: "Starter plan — core collection tools and limits.",
    tierSlugForEmblem: "free",
  },
  {
    badge_type: "tier",
    badge_key: "pro",
    category: "tier",
    displayName: "Pro",
    description: "Pro plan — higher limits, batch capture, and scan tools.",
    tierSlugForEmblem: "pro",
  },
  {
    badge_type: "tier",
    badge_key: "elite",
    category: "tier",
    displayName: "Elite",
    description: "Elite plan — top limits and priority when the scan queue is busy.",
    tierSlugForEmblem: "elite",
  },
  {
    badge_type: "tier",
    badge_key: "business",
    category: "tier",
    displayName: "Business",
    description: "Business plan — built for shops, graders, and high-volume workflows.",
    tierSlugForEmblem: "business",
  },
  {
    badge_type: "tenure",
    badge_key: "member_since_placeholder",
    category: "tenure",
    displayName: "Member since",
    description: "How long you have been part of MyCardArchive.",
  },
  {
    badge_type: "scan_milestone",
    badge_key: "scans_100",
    category: "scan_milestone",
    displayName: "100 scans",
    shortLabel: "100",
    description: "Recorded at least 100 camera scans in MyCardArchive.",
  },
  {
    badge_type: "scan_milestone",
    badge_key: "scans_500",
    category: "scan_milestone",
    displayName: "500 scans",
    shortLabel: "500",
    description: "Recorded at least 500 camera scans in MyCardArchive.",
  },
  {
    badge_type: "scan_milestone",
    badge_key: "scans_1000",
    category: "scan_milestone",
    displayName: "1,000 scans",
    shortLabel: "1K",
    description: "Recorded at least 1,000 camera scans in MyCardArchive.",
  },
  {
    badge_type: "scan_milestone",
    badge_key: "scans_5000",
    category: "scan_milestone",
    displayName: "5,000 scans",
    shortLabel: "5K",
    description: "Recorded at least 5,000 camera scans in MyCardArchive.",
  },
  {
    badge_type: "seasonal_event",
    badge_key: "spring_2026_collector",
    category: "seasonal_event",
    displayName: "Spring 2026 Collector",
    description: "Limited seasonal badge — you joined the Spring 2026 collector moment.",
  },
  {
    badge_type: "seasonal_event",
    badge_key: "summer_2026_scan_sprint",
    category: "seasonal_event",
    displayName: "Summer Scan Sprint 2026",
    description: "Limited seasonal badge — summer sprint for trainers who love scanning.",
  },
  {
    badge_type: "seasonal_event",
    badge_key: "holiday_2026_collector",
    category: "seasonal_event",
    displayName: "Holiday Collector 2026",
    description: "Limited seasonal badge — celebrate the hobby at year’s end.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_scan_50",
    category: "journey",
    displayName: "Journey · 50 scans",
    shortLabel: "J50",
    description: "Completed the “Scan 50 cards” collector journey.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_scan_500",
    category: "journey",
    displayName: "Journey · 500 scans",
    shortLabel: "J500",
    description: "Completed the “Scan 500 cards” collector journey.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_first_binder",
    category: "journey",
    displayName: "Journey · First binder",
    shortLabel: "JB1",
    description: "Completed the “First binder” collector journey.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_ten_sets",
    category: "journey",
    displayName: "Journey · 10 sets",
    shortLabel: "J10",
    description: "Completed the “10 unique catalog sets” collector journey.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_first_seasonal",
    category: "journey",
    displayName: "Journey · First seasonal",
    shortLabel: "JS1",
    description: "Completed the “First seasonal badge” collector journey.",
  },
  {
    badge_type: "journey",
    badge_key: "journey_rep_1000",
    category: "journey",
    displayName: "Journey · 1k reputation",
    shortLabel: "J1K",
    description: "Completed the “1,000 reputation” collector journey.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_binder_first",
    category: "collection_mastery",
    displayName: "Mastery · First full binder",
    shortLabel: "B1",
    description: "Filled every slot in your first complete binder grid.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_binder_three",
    category: "collection_mastery",
    displayName: "Mastery · Three full binders",
    shortLabel: "B3",
    description: "Three binders with no empty slots.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_binder_ten",
    category: "collection_mastery",
    displayName: "Mastery · Ten full binders",
    shortLabel: "B10",
    description: "Ten fully-filled binders.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_set_first",
    category: "collection_mastery",
    displayName: "Mastery · First master set",
    shortLabel: "S1",
    description: "Completed every card in a catalog set.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_set_five",
    category: "collection_mastery",
    displayName: "Mastery · Five master sets",
    shortLabel: "S5",
    description: "Five catalog sets completed to every card.",
  },
  {
    badge_type: "collection_mastery",
    badge_key: "cm_set_ten",
    category: "collection_mastery",
    displayName: "Mastery · Ten master sets",
    shortLabel: "S10",
    description: "Ten catalog sets fully completed.",
  },
  {
    badge_type: "trade_reputation",
    badge_key: "trusted_trader",
    category: "trade_reputation",
    displayName: "Trusted trader",
    shortLabel: "TT",
    description: "Strong positive trade feedback across at least ten completed peer trades.",
  },
  {
    badge_type: "trade_reputation",
    badge_key: "veteran_trader",
    category: "trade_reputation",
    displayName: "Veteran trader",
    shortLabel: "VT",
    description: "Fifty or more completed peer trades on record.",
  },
  {
    badge_type: "trade_reputation",
    badge_key: "reliable_shop",
    category: "trade_reputation",
    displayName: "Reliable shop",
    shortLabel: "RS",
    description: "Business plan with twenty-plus trades and excellent positive feedback ratio.",
  },
  {
    badge_type: "play_identity",
    badge_key: "commander_enthusiast",
    category: "play_identity",
    displayName: "Commander enthusiast",
    shortLabel: "CMD",
    description: "Set Commander as your favorite format on your play identity.",
  },
  {
    badge_type: "play_identity",
    badge_key: "control_specialist",
    category: "play_identity",
    displayName: "Control specialist",
    shortLabel: "CTL",
    description: "Marked control as your favorite deck archetype.",
  },
  {
    badge_type: "play_identity",
    badge_key: "aggro_master",
    category: "play_identity",
    displayName: "Aggro master",
    shortLabel: "AGG",
    description: "Marked aggro as your favorite deck archetype.",
  },
  {
    badge_type: "play_identity",
    badge_key: "deckbuilder",
    category: "play_identity",
    displayName: "Deckbuilder",
    shortLabel: "DB",
    description: "Tracked stats for at least three decks in MyCardArchive.",
  },
  {
    badge_type: "collection_value",
    badge_key: "high_value_collector",
    category: "collection_value",
    displayName: "High-Value Collector",
    shortLabel: "HV",
    description:
      "Estimated collection value crossed a high threshold (cached metadata & latest known prices — not financial advice).",
  },
  {
    badge_type: "collection_value",
    badge_key: "rarity_hunter",
    category: "collection_value",
    displayName: "Rarity Hunter",
    shortLabel: "RH",
    description: "Many rare or premium cards by metadata (mythic / secret / foil class, etc.).",
  },
  {
    badge_type: "collection_value",
    badge_key: "unique_collector",
    category: "collection_value",
    displayName: "Unique Collector",
    shortLabel: "UC",
    description: "A large number of distinct catalog cards in your collection.",
  },
  {
    badge_type: "fandom",
    badge_key: "set_loyalist",
    category: "fandom",
    displayName: "Set Loyalist",
    shortLabel: "SET",
    description: "Pinned a favorite Pokémon TCG expansion on your collector profile.",
  },
  {
    badge_type: "fandom",
    badge_key: "era_specialist",
    category: "fandom",
    displayName: "Era Specialist",
    shortLabel: "ERA",
    description: "Chose an era lane you keep returning to.",
  },
  {
    badge_type: "fandom",
    badge_key: "artist_devotee",
    category: "fandom",
    displayName: "Artist Devotee",
    shortLabel: "ART",
    description: "Pinned a featured illustrator preference.",
  },
  {
    badge_type: "fandom",
    badge_key: "character_fanatic",
    category: "fandom",
    displayName: "Character Fanatic",
    shortLabel: "LINE",
    description: "Tagged a mascot line or collecting motif.",
  },
  {
    badge_type: "fandom",
    badge_key: "theme_collector",
    category: "fandom",
    displayName: "Theme Collector",
    shortLabel: "FOIL",
    description: "Named a chase finish tier you hunt first.",
  },
];

const KEY = (t: string, k: string) => `${t}:${k}`;

const MAP: Record<string, BadgeMeta> = Object.fromEntries(
  META.filter((m) => m.badge_key !== "member_since_placeholder").map((m) => [KEY(m.badge_type, m.badge_key), m])
);

/** Static metadata map — safe to import anywhere (client + server). */
export function getBadgeMeta(badge_type: string, badge_key: string): BadgeMeta | null {
  if (badge_type === "tenure" && badge_key.startsWith("member_since_")) {
    const year = badge_key.replace(/^member_since_/, "").trim() || "—";
    return {
      badge_type: "tenure",
      badge_key,
      category: "tenure",
      displayName: `Member since ${year}`,
      description: `Joined MyCardArchive in ${year}.`,
    };
  }
  return MAP[KEY(badge_type, badge_key)] ?? null;
}

const MILESTONE_RANK: Record<string, number> = {
  scans_100: 100,
  scans_500: 500,
  scans_1000: 1000,
  scans_5000: 5000,
};

const SEASONAL_BADGE_RANK: Record<string, number> = {
  spring_2026_collector: 1,
  summer_2026_scan_sprint: 2,
  holiday_2026_collector: 3,
};

const JOURNEY_BADGE_RANK: Record<string, number> = {
  journey_scan_50: 1,
  journey_scan_500: 2,
  journey_first_binder: 3,
  journey_ten_sets: 4,
  journey_first_seasonal: 5,
  journey_rep_1000: 6,
};

const COLLECTION_MASTERY_BADGE_RANK: Record<string, number> = {
  cm_binder_first: 1,
  cm_binder_three: 2,
  cm_binder_ten: 3,
  cm_set_first: 4,
  cm_set_five: 5,
  cm_set_ten: 6,
};

const TRADE_REPUTATION_BADGE_RANK: Record<string, number> = {
  trusted_trader: 1,
  veteran_trader: 2,
  reliable_shop: 3,
};

const PLAY_IDENTITY_BADGE_RANK: Record<string, number> = {
  deckbuilder: 1,
  aggro_master: 2,
  control_specialist: 3,
  commander_enthusiast: 4,
};

const COLLECTION_VALUE_BADGE_RANK: Record<string, number> = {
  unique_collector: 1,
  rarity_hunter: 2,
  high_value_collector: 3,
};

const FANDOM_BADGE_RANK: Record<string, number> = {
  theme_collector: 1,
  character_fanatic: 2,
  artist_devotee: 3,
  era_specialist: 4,
  set_loyalist: 5,
};

const META_CACHE = new Map<string, BadgeMeta | null>();

/** Client-friendly memo for tooltip labels (no RPC data cached). */
export function getCachedBadgeMeta(badge_type: string, badge_key: string): BadgeMeta | null {
  const k = `${badge_type}:${badge_key}`;
  const hit = META_CACHE.get(k);
  if (hit !== undefined) return hit;
  const m = getBadgeMeta(badge_type, badge_key);
  META_CACHE.set(k, m);
  return m;
}

function badgeTypeSortRank(t: string): number {
  if (t === "tier") return 0;
  if (t === "tenure") return 1;
  if (t === "scan_milestone") return 2;
  if (t === "seasonal_event") return 3;
  if (t === "journey") return 4;
  if (t === "collection_mastery") return 5;
  if (t === "trade_reputation") return 6;
  if (t === "play_identity") return 7;
  if (t === "collection_value") return 8;
  if (t === "fandom") return 9;
  return 11;
}

export function sortBadgeRowsForDisplay(rows: UserBadgeRow[]): UserBadgeRow[] {
  return [...rows].sort((a, b) => {
    const ca = badgeTypeSortRank(a.badge_type);
    const cb = badgeTypeSortRank(b.badge_type);
    if (ca !== cb) return ca - cb;
    if (a.badge_type === "scan_milestone" && b.badge_type === "scan_milestone") {
      return (MILESTONE_RANK[b.badge_key] ?? 0) - (MILESTONE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "seasonal_event" && b.badge_type === "seasonal_event") {
      return (SEASONAL_BADGE_RANK[b.badge_key] ?? 0) - (SEASONAL_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "journey" && b.badge_type === "journey") {
      return (JOURNEY_BADGE_RANK[b.badge_key] ?? 0) - (JOURNEY_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "collection_mastery" && b.badge_type === "collection_mastery") {
      return (COLLECTION_MASTERY_BADGE_RANK[b.badge_key] ?? 0) - (COLLECTION_MASTERY_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "trade_reputation" && b.badge_type === "trade_reputation") {
      return (TRADE_REPUTATION_BADGE_RANK[b.badge_key] ?? 0) - (TRADE_REPUTATION_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "play_identity" && b.badge_type === "play_identity") {
      return (PLAY_IDENTITY_BADGE_RANK[b.badge_key] ?? 0) - (PLAY_IDENTITY_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "collection_value" && b.badge_type === "collection_value") {
      return (COLLECTION_VALUE_BADGE_RANK[b.badge_key] ?? 0) - (COLLECTION_VALUE_BADGE_RANK[a.badge_key] ?? 0);
    }
    if (a.badge_type === "fandom" && b.badge_type === "fandom") {
      return (FANDOM_BADGE_RANK[b.badge_key] ?? 0) - (FANDOM_BADGE_RANK[a.badge_key] ?? 0);
    }
    const ta = a.earned_at ? new Date(a.earned_at).getTime() : 0;
    const tb = b.earned_at ? new Date(b.earned_at).getTime() : 0;
    return ta - tb;
  });
}
