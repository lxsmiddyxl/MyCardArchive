"use client";

import { fetchJson } from "@/lib/client";
import { useEffect } from "react";

export type CollectorRoomSurfaceProps = {
  roomType: "set_room" | "club_room" | "live_feed_room" | "profile_room";
  /** Required except for live_feed_room (ignored there). */
  topicKey?: string | null;
  /** Heartbeat interval — keeps membership warm while the surface is mounted. */
  intervalMs?: number;
};

/**
 * Joins / refreshes an ephemeral collector room while this route is open (Phase 26).
 * No chat — ambient presence only.
 */
export function CollectorRoomSurface({
  roomType,
  topicKey,
  intervalMs = 120_000,
}: CollectorRoomSurfaceProps) {
  useEffect(() => {
    const refresh = () => {
      if (roomType !== "live_feed_room" && !topicKey?.trim()) return;
      void fetchJson("/api/collector-rooms/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType,
          topicKey: roomType === "live_feed_room" ? "" : topicKey,
        }),
      });
    };
    refresh();
    const id = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(id);
  }, [roomType, topicKey, intervalMs]);

  return null;
}
