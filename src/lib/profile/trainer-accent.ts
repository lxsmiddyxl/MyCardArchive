/**
 * Maps free-text profile favorite_color to a safe CSS color for inline styles.
 */
const FALLBACK_ACCENT = "#a855f7";

const ALLOWED_NAMES = new Set([
  "coral",
  "gold",
  "orange",
  "tomato",
  "orchid",
  "plum",
  "turquoise",
  "skyblue",
  "mediumseagreen",
  "mediumslateblue",
  "deeppink",
  "hotpink",
]);

export function safeTrainerAccent(color: string | null | undefined): string {
  const s = color?.trim();
  if (!s) return FALLBACK_ACCENT;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  if (ALLOWED_NAMES.has(s.toLowerCase())) return s;

  return FALLBACK_ACCENT;
}
