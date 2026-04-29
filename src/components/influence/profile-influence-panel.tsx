import { getInfluenceDimensionById } from "@/lib/influence/influence-catalog";
import type { SocialInfluenceBlock } from "@/lib/social/types";
import { Panel } from "@/mca-ui/panel";

const AXES = [
  { id: "identity_reach" as const, label: "Identity" },
  { id: "contribution_reach" as const, label: "Contrib" },
  { id: "expertise_reach" as const, label: "Expert" },
  { id: "social_reach" as const, label: "Social" },
  { id: "seasonal_reach" as const, label: "Seasonal" },
];

export type ProfileInfluencePanelProps = {
  block: SocialInfluenceBlock;
};

export function ProfileInfluencePanel({ block }: ProfileInfluencePanelProps) {
  const cx = 100;
  const cy = 100;
  const maxR = 72;
  const n = AXES.length;
  const pts = AXES.map((axis, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const t = Math.min(1, Math.max(0, (block.radar[axis.id] ?? 0) / 100));
    const r = t * maxR;
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), label: axis.label };
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  const top = block.topDimension ? getInfluenceDimensionById(block.topDimension) : null;

  return (
    <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
      <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Influence</h2>
      <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
        Descriptive network reach across identity, contribution, expertise, social overlap, and seasonal moments.
        This is never a leaderboard or competitive rank.
      </p>
      {block.summary ? (
        <p className="mt-mca-sm text-sm font-medium text-mca-ink-strong">{block.summary}</p>
      ) : null}
      {top ? (
        <p className="mt-mca-xs inline-flex items-center gap-mca-xs rounded-full border border-mca-border/70 bg-mca-surface/60 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-body">
          <span aria-hidden>{top.icon}</span>
          <span>
            Top influence · <span className="font-semibold text-mca-ink-strong">{top.displayName}</span>
          </span>
        </p>
      ) : null}
      <div className="mt-mca-md flex flex-col gap-mca-lg lg:flex-row lg:items-center">
        <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48 shrink-0 text-mca-accent" role="img" aria-label="Influence shape (five dimensions)">
          <polygon
            points={AXES.map((_, i) => {
              const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
              const x = cx + maxR * Math.cos(ang);
              const y = cy + maxR * Math.sin(ang);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
          <path d={d} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.5} />
          {pts.map((p) => (
            <circle key={p.label} cx={p.x} cy={p.y} r={2.5} fill="currentColor" />
          ))}
        </svg>
        <div className="min-w-0 flex-1">
          <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Recent influence moments
          </h3>
          <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-muted">
            {(block.recentEvents ?? []).slice(0, 8).map((ev, i) => (
              <li key={`${ev.label}-${ev.occurredOn}-${i}`} className="flex flex-wrap gap-mca-xs">
                <span className="text-mca-ink-subtle">{ev.occurredOn || "—"}</span>
                <span className="text-mca-ink-body">{ev.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
