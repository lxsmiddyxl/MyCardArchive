/**
 * Lightweight moderation filters for community text (Phase 69).
 * Complements `sanitizePlainTextUserInput` with policy blocks (no PII logging here).
 */
const ABUSE_PATTERN = /\b(kill\s*yourself|kys)\b/i;

/** Detects disallowed tokens / obvious abuse shapes. */
export function moderationTokensViolated(text: string): boolean {
  if (!text) return false;
  if (ABUSE_PATTERN.test(text)) return true;
  const combining = text.match(/\u0300/g);
  if (combining && combining.length > 48) return true;
  return false;
}
