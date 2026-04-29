"use client";

import type { InventoryCardItem } from "@/components/cards/inventory-types";
import { Button } from "@/mca-ui/button";
import { Icon } from "@/mca-ui/icon";
import { McaIcons } from "@/lib/icons/mca-icons";
import { rarityIconSrc } from "@/lib/icons/rarity";
import { memo } from "@/lib/perf/memo";
import Image from "next/image";
import Link from "next/link";

const IMG_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type Props = {
  card: InventoryCardItem;
  listBusy: boolean;
  onOpenDetail: (id: string) => void;
};

export const InventoryCardRow = memo(function InventoryCardRow({
  card,
  listBusy,
  onOpenDetail,
}: Props) {
  const thumb = card.image_front_thumb_url ?? card.image_url;
  const supabaseThumb = Boolean(thumb?.includes("supabase.co"));

  return (
    <article
      className={`mca-tile-mount rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 p-mca-md shadow-mca-panel transition-all duration-200 ease-mca-standard hover:border-mca-border-subtle hover:bg-mca-chrome/40 hover:shadow-mca-card dark:border-mca-border-subtle ${listBusy ? "pointer-events-none opacity-60" : ""}`}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer gap-mca-md rounded-mca-control text-left transition-all duration-200 ease-mca-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
        disabled={listBusy}
        onClick={() => onOpenDetail(card.id)}
      >
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface dark:border-mca-border-subtle">
          {thumb ? (
            <Image
              src={thumb}
              alt={card.name}
              fill
              sizes="80px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={IMG_BLUR}
              unoptimized={!supabaseThumb}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-mca-xs text-center text-mca-caption text-mca-hint">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-mca-body font-semibold text-mca-ink-strong">{card.name}</h3>
          <p className="mt-mca-sm flex items-center gap-mca-micro text-mca-caption text-mca-ink-muted">
            <Icon src={McaIcons.system.info} size="sm" alt="" className="opacity-80" />
            <span className="truncate">{card.set ?? "Unknown set"}</span>
          </p>
          <p className="mt-mca-xs flex items-center gap-mca-micro text-mca-caption text-mca-ink-muted">
            <Icon src={rarityIconSrc(card.rarity)} size="sm" alt="" className="opacity-80" />
            <span className="truncate">{card.rarity ?? "—"}</span>
          </p>
          <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">
            Binder:{" "}
            <span className="font-medium text-mca-ink-muted">{card.binder_name ?? card.binder_id}</span>
          </p>
        </div>
      </button>

      <div className="mt-mca-md grid grid-cols-1 gap-mca-sm sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          disabled={listBusy}
          className="w-full text-mca-caption"
          onClick={() => {
            if (listBusy) return;
            onOpenDetail(card.id);
          }}
        >
          <Icon src={McaIcons.system.info} size="sm" alt="" />
          Card details
        </Button>
        <Link
          href={`/binders/${encodeURIComponent(card.binder_id)}`}
          className="inline-flex w-full items-center justify-center gap-mca-sm rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-mca-caption font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle hover:border-mca-border-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface active:scale-[0.98]"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon src={McaIcons.collection.binder} size="sm" alt="" />
          View binder
        </Link>
      </div>
    </article>
  );
});
InventoryCardRow.displayName = "InventoryCardRow";
