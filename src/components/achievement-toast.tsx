"use client";

import { useEffect, useState } from "react";
import { normalizeRarity } from "@/lib/achievements/rarity";

type Props = {
  toastKey: string;
  icon: string;
  title: string;
  rarity: string;
  onDone: (key: string) => void;
  /** ms visible before fade-out */
  visibleMs?: number;
};

export function AchievementToastItem({
  toastKey,
  icon,
  title,
  rarity,
  onDone,
  visibleMs = 4000,
}: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), visibleMs);
    const remove = window.setTimeout(() => onDone(toastKey), visibleMs + 320);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(remove);
    };
  }, [toastKey, onDone, visibleMs]);

  const r = normalizeRarity(rarity);
  const accent =
    r === "legendary"
      ? "border-mca-accent-strong/50 bg-mca-warning-surface/90 shadow-[0_0_24px_rgba(234,179,8,0.2)]"
      : r === "rare"
        ? "border-blue-500/45 bg-mca-surface-elevated/95 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
        : "border-mca-field-border bg-mca-surface-elevated/95";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`ach-toast pointer-events-auto flex max-w-sm items-center gap-mca-compact rounded-mca-card border px-mca-base py-mca-compact shadow-mca-card backdrop-blur-sm ${accent} ${
        leaving ? "ach-toast--leaving" : ""
      }`}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mca-accent/95">
          Achievement Unlocked!
        </p>
        <p className="truncate text-sm font-medium text-mca-ink-strong">{title}</p>
      </div>
    </div>
  );
}
