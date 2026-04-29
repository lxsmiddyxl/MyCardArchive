"use client";

import Image from "next/image";
import type { DragEventHandler } from "react";

const BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function isSupabaseHosted(src: string): boolean {
  try {
    return new URL(src).hostname.endsWith("supabase.co");
  } catch {
    return false;
  }
}

export type RemoteCardThumbProps = {
  src: string;
  alt: string;
  /** Parent must be `position: relative` with explicit size when using fill */
  className?: string;
  sizes: string;
  priority?: boolean;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLImageElement>;
  onDragEnd?: DragEventHandler<HTMLImageElement>;
};

/**
 * Card thumbnails from Supabase (optimized) or arbitrary HTTPS URLs (unoptimized).
 */
export function RemoteCardThumb({
  src,
  alt,
  className,
  sizes,
  priority,
  draggable,
  onDragStart,
  onDragEnd,
}: RemoteCardThumbProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className ?? "object-cover"}
      placeholder="blur"
      blurDataURL={BLUR}
      unoptimized={!isSupabaseHosted(src)}
      priority={priority}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}
