"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import { pickFollowBackCandidates } from "@/lib/social/follow-back-hints";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useCallback, useEffect } from "react";

type Collector = { user_id?: string; username?: string | null };

/**
 * Suggested collectors + soft follow-back hint (Phase 66).
 */
export function SocialSuggestedCollectorsStrip() {
  const { run, data, loading } = useAsyncState<{
    suggested: Collector[];
    followBackNudge: boolean;
  }>();

  const load = useCallback(() => {
    return run(async () => {
      const auth = await supabaseBrowser().auth.getUser();
      const myId = auth.data.user?.id ?? "";
      const [rec, edges] = await Promise.all([
        fetchJson<{ collectors?: Collector[] }>("/api/social/recommended-collectors?limit=8", {
          cache: "no-store",
        }),
        fetchJson<{ following?: string[]; followers?: string[] }>("/api/social/follow-edges", {
          cache: "no-store",
        }),
      ]);
      if (rec.kind !== "ok") throw new Error(fetchJsonErrorMessage(rec));
      const suggested = Array.isArray(rec.data.collectors) ? rec.data.collectors : [];
      const iFollow = new Set<string>();
      const followsMe = new Set<string>();
      if (edges.kind === "ok") {
        for (const id of edges.data.following ?? []) {
          if (id) iFollow.add(id);
        }
        for (const id of edges.data.followers ?? []) {
          if (id) followsMe.add(id);
        }
      }
      const followBack = pickFollowBackCandidates({
        iFollow,
        followsMe,
        myId,
        max: 8,
      });
      return {
        suggested,
        followBackNudge: followBack.length > 0,
      };
    });
  }, [run]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggested = data?.suggested ?? [];
  const followBackNudge = data?.followBackNudge ?? false;
  if (!loading && suggested.length === 0 && !followBackNudge) return null;

  return (
    <Panel className="border border-mca-border-subtle bg-mca-surface-elevated/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Social graph
      </p>
      {loading ? (
        <p className="mt-mca-xs text-sm text-mca-ink-muted">Loading suggestions…</p>
      ) : (
        <div className="mt-mca-sm space-y-mca-sm text-sm text-mca-ink-body">
          {suggested.length > 0 ? (
            <div>
              <p className="font-medium text-mca-ink-strong">Suggested collectors</p>
              <ul className="mt-mca-xs list-inside list-disc text-mca-ink-muted">
                {suggested.slice(0, 6).map((c, idx) => (
                  <li key={c.user_id ?? `s-${idx}`}>
                    {c.user_id ? (
                      <Link className="text-mca-accent-tint hover:underline" href={`/profile/${c.user_id}`}>
                        {c.username?.trim() || "Collector"}
                      </Link>
                    ) : (
                      "Collector"
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {followBackNudge ? (
            <p className="text-mca-caption text-mca-ink-muted">
              A few collectors you follow have not followed back yet — say hello on their public profile when it
              feels natural.
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
