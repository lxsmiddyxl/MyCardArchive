"use client";

import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { rarityIconSrc } from "@/lib/icons/rarity";
import type { TradeCardLine } from "@/lib/trading/types";
import { memo } from "react";

export type TradeCardRowProps = {
  line: TradeCardLine;
  onSelect?: (line: TradeCardLine) => void;
};

export const TradeCardRow = memo(function TradeCardRow({ line, onSelect }: TradeCardRowProps) {
  const interactive = Boolean(onSelect);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`flex gap-mca-md rounded-mca-block border border-mca-border bg-mca-surface-elevated/50 p-mca-md transition-all duration-200 ease-mca-standard dark:border-mca-border-subtle ${
        interactive
          ? "cursor-pointer hover:border-mca-field-border hover:bg-mca-chrome/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
          : ""
      }`}
      onClick={interactive ? () => onSelect?.(line) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(line);
              }
            }
          : undefined
      }
    >
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface dark:border-mca-border-subtle">
        {line.imageUrl ? (
          <RemoteCardThumb
            src={line.imageUrl}
            alt=""
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-mca-caption text-mca-hint">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-mca-body font-semibold text-mca-ink-strong">
          {line.name}
          {(line.quantity ?? 1) > 1 ? (
            <span className="ml-mca-xs text-mca-caption font-normal text-mca-accent/90">
              ×{line.quantity ?? 1}
            </span>
          ) : null}
        </p>
        <p className="mt-mca-xs flex items-center gap-mca-micro text-mca-caption text-mca-ink-muted">
          <Icon src={McaIcons.system.info} size="sm" alt="" className="opacity-80" />
          <span className="truncate">{line.setName ?? "—"}</span>
        </p>
        <p className="mt-mca-xs flex items-center gap-mca-micro text-mca-caption text-mca-ink-muted">
          <Icon src={rarityIconSrc(line.rarity)} size="sm" alt="" className="opacity-80" />
          {line.rarity ?? "—"}
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">
          Binder: {line.binderName ?? line.binderId}
        </p>
      </div>
    </div>
  );
});
