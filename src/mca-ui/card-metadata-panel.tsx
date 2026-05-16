"use client";

import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { Panel } from "@/mca-ui/panel";
import type { BinderAccent } from "@/lib/binders/binder-accent";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";

export type CardMetadataPanelData = {
  name: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
  supertype?: string;
  subtypes?: string[];
};

export type CardMetadataPanelProps = {
  data: CardMetadataPanelData;
  title?: string;
  className?: string;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: BinderAccent;
};

export function CardMetadataPanel({
  data,
  title = "Card preview",
  className,
  headerExtra,
  footer,
  accent,
}: CardMetadataPanelProps) {
  return (
    <Panel
      className={cn(
        "p-mca-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        accent?.borderClass ?? "border-mca-accent-border/40",
        accent?.surfaceClass ?? "bg-mca-accent-border/10",
        MCA_MOTION_PANEL,
        className
      )}
      style={accent?.color ? { borderColor: `${accent.color}66` } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          {title}
        </p>
        {headerExtra}
      </div>

      <div className="mt-mca-sm flex gap-mca-sm">
        <div className="relative h-[4.5rem] w-[3.25rem] shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
          {data.imageUrl ? (
            <RemoteCardThumb
              src={data.imageUrl}
              alt=""
              sizes="52px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-mca-hint">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-mca-xs">
          <p className="truncate text-sm font-semibold text-mca-ink-strong">{data.name}</p>
          <div className="flex flex-wrap gap-mca-xs">
            {data.setName ? (
              <span className="inline-flex max-w-full truncate rounded-mca-pill border border-mca-border/80 bg-mca-surface/60 px-mca-sm py-mca-trace text-mca-caption font-medium text-mca-ink-body">
                {data.setName}
              </span>
            ) : null}
            {data.number ? (
              <span className="inline-flex rounded-mca-pill border border-mca-border/80 bg-mca-chrome/40 px-mca-sm py-mca-trace font-mono text-mca-caption text-mca-ink-muted">
                #{data.number}
              </span>
            ) : null}
            {data.rarity ? (
              <span className="inline-flex rounded-mca-pill border border-mca-accent-border/35 bg-mca-accent-border/10 px-mca-sm py-mca-trace text-mca-caption font-medium text-mca-accent">
                {data.rarity}
              </span>
            ) : null}
          </div>
          {(data.supertype || (data.subtypes && data.subtypes.length > 0)) && (
            <p className="truncate text-mca-caption text-mca-ink-subtle">
              {data.supertype ?? ""}
              {data.subtypes?.length ? ` · ${data.subtypes.join(", ")}` : ""}
            </p>
          )}
        </div>
      </div>
      {footer ? <div className="mt-mca-sm">{footer}</div> : null}
    </Panel>
  );
}
