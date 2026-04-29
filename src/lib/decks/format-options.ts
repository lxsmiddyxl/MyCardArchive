/**
 * Pokémon TCG–oriented deck formats (values persist on `decks.format`;
 * `normalizeDeckFormat` maps legacy values like `modern` → standard).
 */
export const DECK_FORMAT_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "expanded", label: "Expanded" },
  { value: "unlimited", label: "Unlimited" },
  { value: "commander", label: "Brawl" },
  { value: "custom", label: "Custom" },
] as const;

export type DeckFormatOptionValue = (typeof DECK_FORMAT_OPTIONS)[number]["value"];

const ALLOWED = new Set<string>(DECK_FORMAT_OPTIONS.map((o) => o.value));

/** Maps persisted `decks.format` (and legacy values) to a select value. */
export function deckFormatToSelectValue(
  raw: string | null | undefined
): DeckFormatOptionValue {
  const n = (raw ?? "standard").toLowerCase().trim();
  if (n === "modern") return "standard";
  if (ALLOWED.has(n)) return n as DeckFormatOptionValue;
  return "standard";
}
