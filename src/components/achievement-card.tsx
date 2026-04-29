import { normalizeRarity, rarityDisplay } from "@/lib/achievements/rarity";

type Props = {
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number | null;
  requirement_value: number;
  rarity: string;
};

export function AchievementCard({
  title,
  description,
  icon,
  unlocked,
  progress,
  requirement_value,
  rarity,
}: Props) {
  const current = progress ?? 0;
  const showBar = requirement_value > 1;
  const pct = unlocked
    ? 100
    : Math.min(
        100,
        requirement_value > 0 ? (current / requirement_value) * 100 : 0
      );

  const r = normalizeRarity(rarity);

  const rarityBadgeClass =
    r === "legendary"
      ? "border-mca-accent-strong/50 bg-mca-accent-strong/15 text-mca-nav-accent"
      : r === "rare"
        ? "border-blue-500/45 bg-blue-500/15 text-blue-200"
        : "border-mca-field-border bg-mca-chrome/80 text-mca-ink-muted";

  const borderBg =
    unlocked
      ? r === "legendary"
        ? "border-mca-accent-strong/45 bg-gradient-to-br from-mca-warning-surface/50 via-mca-surface-elevated/90 to-mca-surface"
        : r === "rare"
          ? "border-blue-500/35 bg-gradient-to-br from-blue-950/30 via-mca-surface-elevated/90 to-mca-surface"
          : "border-mca-field-border/60 bg-gradient-to-br from-mca-surface-elevated/85 to-mca-surface"
      : "border-mca-border bg-mca-surface-elevated/40";

  const animUnlock =
    unlocked && r === "legendary"
      ? "ach-card--unlocked-legendary"
      : unlocked && r === "rare"
        ? "ach-card--unlocked-rare"
        : "";

  return (
    <article
      className={`ach-card mca-row-reveal relative flex flex-col rounded-mca-block border p-mca-comfortable shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card ${borderBg} ${
        unlocked ? animUnlock : "ach-card--locked"
      }`}
    >
      <div className="ach-card__shine" aria-hidden />
      <div className="pointer-events-none absolute left-3 top-3 z-[1]">
        <span
          className={`inline-block rounded-mca-control border px-mca-sm py-mca-trace text-[10px] font-bold uppercase tracking-wider ${rarityBadgeClass}`}
        >
          {rarityDisplay(rarity)}
        </span>
      </div>
      {unlocked ? (
        <span className="absolute right-3 top-3 z-[1] rounded-full bg-mca-accent-strong/20 px-mca-tight py-mca-trace text-xs font-semibold text-mca-nav-accent">
          Unlocked!
        </span>
      ) : null}
      <div className="mt-mca-loft flex items-start gap-mca-compact">
        <span
          className="select-none text-3xl leading-none"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-mca-xs">
          <h3 className="text-base font-semibold text-mca-ink-strong">{title}</h3>
          <p className="text-sm leading-relaxed text-mca-ink-muted">
            {description}
          </p>
        </div>
      </div>
      {showBar ? (
        <div className="mt-mca-base space-y-mca-micro">
          <div className="flex justify-between text-xs text-mca-ink-subtle">
            <span>Progress</span>
            <span className="tabular-nums text-mca-ink-muted">
              {unlocked ? "Complete" : `${current} / ${requirement_value}`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-mca-chrome"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-label={`${current} of ${requirement_value}`}
          >
            <div
              className={`h-full rounded-full transition-all ${
                unlocked ? "bg-mca-accent-strong" : "bg-mca-neutral-dot"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
