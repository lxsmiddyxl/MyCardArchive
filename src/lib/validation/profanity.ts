/**
 * Shared profanity detection and vowel masking for family-friendly display strings.
 */

/** Curated substring blocklist (lowercase). Keep conservative for a family-friendly TCG app. */
export const PROFANITY_FRAGMENTS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nazi",
  "nigga",
  "nigger",
  "rape",
  "porn",
  "slut",
  "whore",
  "kill",
  "terror",
  "hitler",
  "coon",
  "fag",
  "retard",
  "spic",
] as const;

function normalizeForProfanity(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function leetNormalize(s: string): string {
  return s
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a");
}

/** True if text matches the curated blocklist after normalization (incl. simple leetspeak). */
export function isOffensive(text: string): boolean {
  if (!text) return false;
  const n = normalizeForProfanity(text);
  if (!n) return false;
  const l = leetNormalize(n);
  for (const w of PROFANITY_FRAGMENTS) {
    if (l.includes(w)) return true;
  }
  return false;
}

/** Replace Latin vowels with * (visual censor). */
export function censor(text: string): string {
  return text.replace(/[aeiouyAEIOUY]/g, "*");
}
