/**
 * Collector persona — fragment vocabulary and composition rules.
 * Keep thresholds aligned with value/trade helpers and SQL `refresh_user_persona`.
 */

/** Default line when no identity signals are present. */
export const PERSONA_DEFAULT_LINE =
  "A Pokémon TCG collector shaping their archive one binder at a time.";

/** Max length for social surfaces (soft cap; builder trims gracefully). */
export const PERSONA_MAX_CHARS = 220;

/**
 * Priority when assembling clauses (first → last in the flowing sentence):
 * 1. Play identity (format / archetype)
 * 2. Fandom (era + character / artist / theme — woven)
 * 3. Value / rarity posture (never dollar amounts)
 * 4. Collection mastery
 * 5. Trade reputation
 * 6. Seasonal flavor (short tail)
 * Optional: journey highlight after mastery when space allows.
 */

export const VALUE_FRAGMENTS = {
  highPortfolio:
    "with a binder tilt toward premium singles (approximate estimates only)",
  rarityHunter: "who chases high-rarity hits",
  varietySeeker: "who prioritizes broad variety across the binder",
  rarityHeavy: "with a rarity-heavy mix",
  uniqueLean: "with a distinct-card lean",
  balancedBinder: "with a balanced binder profile",
  bulkLean: "who enjoys deep bulk and commons grids",
} as const;

export const MASTERY_FRAGMENTS = {
  binderAndSet: "who clears binder and set mastery milestones",
  binderOnly: "who pushes binder mastery goals",
  setOnly: "who targets set completion milestones",
  completing: "who steadily completes mastery checkpoints",
} as const;

export const TRADE_FRAGMENTS = {
  reliable_shop: "recognized among traders as a reliable shop-front presence",
  veteran_trader: "seasoned by deep marketplace history",
  trusted_trader: "recognized among trainers as a trusted trader",
} as const;

export const SEASONAL_FRAGMENTS: Record<string, string> = {
  spring_2026_collector: "seasonally tuned like a spring collector sprint",
  summer_2026_scan_sprint: "fresh off a summer scan sprint mindset",
  holiday_2026_collector: "carrying year-end holiday collector energy",
};
