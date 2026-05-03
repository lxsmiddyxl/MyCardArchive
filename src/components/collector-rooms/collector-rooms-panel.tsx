"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  useAsyncState,
  useDebouncedSurfaceReload,
} from "@/lib/client";
import type {
  CollectorRoomPayloadDTO,
  CollectorRoomsActivePayloadDTO,
} from "@/lib/dto/collector-rooms";
import { SOCIAL_SURFACES_REFRESH_EVENT } from "@/lib/social/social-surfaces-refresh";
import type { CollectorRoomType } from "@/lib/collector-rooms/room-presence-label";
import { surfaceRoomCaption } from "@/lib/collector-rooms/room-presence-label";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CollectorRoomsPanelProps = {
  /** When set, prioritize this ambient context (set/club/profile/live feed). */
  contextRoomType?: CollectorRoomType;
  contextTopicKey?: string | null;
  className?: string;
};

function isRoomType(x: string): x is CollectorRoomType {
  return (
    x === "set_room" ||
    x === "club_room" ||
    x === "live_feed_room" ||
    x === "profile_room"
  );
}

type RoomsView = {
  rooms: CollectorRoomPayloadDTO[];
  spotlights: string[];
};

/**
 * Ambient panel — active ephemeral rooms, avatars, qualitative copy only (Phase 26).
 */
export function CollectorRoomsPanel({
  contextRoomType,
  contextTopicKey,
  className,
}: CollectorRoomsPanelProps) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading } = useAsyncState<RoomsView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<CollectorRoomsActivePayloadDTO>("/api/collector-rooms/active", {
        cache: "no-store",
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      return {
        rooms: Array.isArray(r.data.rooms) ? r.data.rooms : [],
        spotlights: Array.isArray(r.data.spotlights) ? r.data.spotlights : [],
      };
    });
  }, [run]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
    const id = window.setInterval(() => void load(), 90_000);
    return () => window.clearInterval(id);
  }, [load]);

  const scheduleSocialRoomsReload = useDebouncedSurfaceReload(load, 180);

  useEffect(() => {
    const onSocial = () => scheduleSocialRoomsReload();
    window.addEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onSocial);
    return () => window.removeEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onSocial);
  }, [scheduleSocialRoomsReload]);

  const rooms = useMemo(() => data?.rooms ?? [], [data]);
  const spotlights = useMemo(() => data?.spotlights ?? [], [data]);

  const visible = useMemo(() => {
    if (!contextRoomType) return rooms;
    return rooms.filter((r) => {
      if (!isRoomType(r.roomType)) return false;
      if (contextRoomType === "live_feed_room") return r.roomType === "live_feed_room";
      return (
        r.roomType === contextRoomType &&
        (contextTopicKey == null ||
          contextTopicKey === r.topicKey ||
          (contextTopicKey === "" && r.topicKey == null))
      );
    });
  }, [rooms, contextRoomType, contextTopicKey]);

  const list = visible.length > 0 ? visible : rooms;

  if (!bootstrapped) return null;

  if (list.length === 0 && spotlights.length === 0) return null;

  return (
    <Panel
      className={cn(
        "border border-mca-border/80 bg-mca-surface-elevated/35 p-mca-md",
        className
      )}
    >
      <section aria-live="polite" aria-busy={loading}>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Collector rooms
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
          Ambient overlap — no chat, just who&apos;s exploring the same space right now. Rooms fade after
          quiet stretches.
        </p>
        {list.length > 0 ? (
          <ul className="mt-mca-md space-y-mca-md">
            {list.map((room) => {
              const rt = isRoomType(room.roomType) ? room.roomType : "live_feed_room";
              const caption = surfaceRoomCaption(rt);
              return (
                <li
                  key={room.roomId}
                  className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm"
                >
                  <p className="text-sm font-medium text-mca-ink-body">{caption}</p>
                  <p className="mt-mca-micro text-mca-caption text-mca-ink-subtle">
                    {room.memberTotal <= 1
                      ? "You’re here — invite overlap by keeping this page open."
                      : `${room.memberTotal} collectors in this room`}
                  </p>
                  {room.members.length > 0 ? (
                    <ul className="mt-mca-sm flex flex-wrap gap-mca-sm">
                      {room.members.map((m) => (
                        <li key={m.userId} className="relative">
                          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-mca-border bg-mca-chrome">
                            {m.avatarUrl ? (
                              <Image
                                src={m.avatarUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="36px"
                                unoptimized={m.avatarUrl.startsWith("data:")}
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-mca-caption text-mca-ink-muted">
                                —
                              </span>
                            )}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border border-mca-surface bg-mca-success-bold/90 transition-all duration-200 ease-mca-standard"
                            title="In this room"
                            aria-hidden
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {spotlights.length > 0 ? (
          <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-subtle">
            {spotlights.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </Panel>
  );
}
