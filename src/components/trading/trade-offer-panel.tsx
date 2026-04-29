"use client";

import { Panel } from "@/mca-ui/panel";
import type { ReactNode } from "react";
import { memo } from "react";

export type TradeOfferPanelProps = {
  title: string;
  subtitle?: string;
  /** Fires when the user interacts with the offer (negotiation presence hints). */
  onOfferInteraction?: () => void;
  children: ReactNode;
};

export const TradeOfferPanel = memo(function TradeOfferPanel({
  title,
  subtitle,
  onOfferInteraction,
  children,
}: TradeOfferPanelProps) {
  return (
    <Panel className="border-mca-border bg-mca-surface/35 p-mca-md transition-all duration-200 ease-mca-standard">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">{title}</p>
      {subtitle ? (
        <p className="mt-mca-xs text-mca-caption text-mca-hint">{subtitle}</p>
      ) : null}
      <div
        className="mt-mca-md space-y-mca-sm"
        onPointerDownCapture={() => onOfferInteraction?.()}
        onFocusCapture={() => onOfferInteraction?.()}
        tabIndex={-1}
      >
        {children}
      </div>
    </Panel>
  );
});
