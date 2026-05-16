import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import type { CSSProperties } from "react";

export type BinderThemeId = "default" | "dark" | "holo" | "set";

export const BINDER_THEME_LABELS: Record<BinderThemeId, string> = {
  default: "Default",
  dark: "Dark",
  holo: "Holo",
  set: "Set accent",
};

const STORAGE_PREFIX = "mca.binder.theme.";

export function binderThemeStorageKey(binderId: string): string {
  return `${STORAGE_PREFIX}${binderId}`;
}

export function getBinderTheme(binderId: string): BinderThemeId {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(binderThemeStorageKey(binderId));
    if (raw === "dark" || raw === "holo" || raw === "set" || raw === "default") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "default";
}

export function setBinderTheme(binderId: string, theme: BinderThemeId): void {
  try {
    localStorage.setItem(binderThemeStorageKey(binderId), theme);
  } catch {
    /* ignore */
  }
}

export type BinderThemeClasses = {
  shell: string;
  slotBorder: string;
  holoOverlay?: boolean;
  style?: CSSProperties;
};

export function getBinderThemeClasses(
  themeId: BinderThemeId,
  binderId: string,
  dominantSetColor?: string | null
): BinderThemeClasses {
  const accent = resolveBinderAccent(binderId);
  const color = dominantSetColor?.trim() || accent.color;

  switch (themeId) {
    case "dark":
      return {
        shell:
          "border-mca-border/90 bg-gradient-to-br from-zinc-950 via-mca-surface to-zinc-900",
        slotBorder: "border-zinc-700/80",
      };
    case "holo":
      return {
        shell:
          "border-mca-accent-border/40 bg-gradient-to-br from-mca-surface-elevated via-mca-surface to-mca-chrome/40",
        slotBorder: "border-mca-accent-border/35",
        holoOverlay: true,
      };
    case "set":
      return {
        shell: "border-mca-border/80 bg-mca-surface-elevated/90",
        slotBorder: accent.borderClass,
        style: { borderColor: `${color}44` },
      };
    default:
      return {
        shell:
          "border-mca-border/90 bg-gradient-to-br from-mca-surface-elevated via-mca-surface to-mca-surface",
        slotBorder: accent.borderClass,
        style: accent.color ? { borderColor: `${accent.color}33` } : undefined,
      };
  }
}
