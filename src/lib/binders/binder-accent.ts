/** Deterministic binder accent when no stored color exists on `binders`. */
export type BinderAccent = {
  /** CSS color for borders / inline styles */
  color: string;
  /** Tailwind-compatible border class fallback */
  borderClass: string;
  /** Subtle background tint class */
  surfaceClass: string;
  /** Button tint classes */
  buttonClass: string;
};

const ACCENT_PALETTE = [
  { color: "#6366f1", border: "border-indigo-500/40", surface: "bg-indigo-500/10", button: "border-indigo-500/50 bg-indigo-600/90" },
  { color: "#0ea5e9", border: "border-sky-500/40", surface: "bg-sky-500/10", button: "border-sky-500/50 bg-sky-600/90" },
  { color: "#10b981", border: "border-emerald-500/40", surface: "bg-emerald-500/10", button: "border-emerald-500/50 bg-emerald-600/90" },
  { color: "#f59e0b", border: "border-amber-500/40", surface: "bg-amber-500/10", button: "border-amber-500/50 bg-amber-600/90" },
  { color: "#ec4899", border: "border-pink-500/40", surface: "bg-pink-500/10", button: "border-pink-500/50 bg-pink-600/90" },
  { color: "#8b5cf6", border: "border-violet-500/40", surface: "bg-violet-500/10", button: "border-violet-500/50 bg-violet-600/90" },
] as const;

const NEUTRAL: BinderAccent = {
  color: "var(--mca-accent, #6366f1)",
  borderClass: "border-mca-accent-border/40",
  surfaceClass: "bg-mca-accent-border/10",
  buttonClass: "border-mca-accent-border/50 bg-mca-accent-strong/90",
};

function hashBinderId(binderId: string): number {
  let h = 0;
  for (let i = 0; i < binderId.length; i++) {
    h = (h * 31 + binderId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function resolveBinderAccent(
  binderId: string,
  storedColor?: string | null
): BinderAccent {
  const hex = storedColor?.trim();
  if (hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    return {
      color: hex,
      borderClass: NEUTRAL.borderClass,
      surfaceClass: NEUTRAL.surfaceClass,
      buttonClass: NEUTRAL.buttonClass,
    };
  }
  if (!binderId.trim()) return NEUTRAL;
  const pick = ACCENT_PALETTE[hashBinderId(binderId) % ACCENT_PALETTE.length]!;
  return {
    color: pick.color,
    borderClass: pick.border,
    surfaceClass: pick.surface,
    buttonClass: pick.button,
  };
}
