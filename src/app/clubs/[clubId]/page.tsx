import { ClubActivityWave } from "@/components/activity-waves/club-activity-wave";
import { CollectorRoomSurface } from "@/components/collector-rooms/collector-room-surface";
import { CollectorRoomsPanel } from "@/components/collector-rooms/collector-rooms-panel";
import { CollectorQuickSearch } from "@/components/search/collector-quick-search";
import { MiniActivityStrip } from "@/components/activity/mini-activity-strip";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { getClubById } from "@/lib/clubs/club-catalog";
import { loadSocialPresenceByUserIds } from "@/lib/presence/load-presence-batch";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const HEADER_RING: Record<string, string> = {
  "mca-accent-strong": "from-mca-accent-strong/25",
  "mca-warn": "from-mca-warn/20",
  "mca-ok": "from-mca-ok/20",
  "mca-accent": "from-mca-accent/20",
  "mca-gold": "from-amber-400/25",
  "mca-ink-strong": "from-mca-ink-strong/15",
  "mca-accent-soft": "from-mca-accent-soft/20",
};

type MemberRow = {
  user_id: string;
  display_name: string;
  username: string;
  handle: string;
  avatar_url: string;
  persona_text: string;
  similarity_score: number | null;
};

export default async function ClubDetailPage({ params }: { params: { clubId: string } }) {
  const clubId = decodeURIComponent(params.clubId ?? "").trim();
  const club = getClubById(clubId);
  if (!club) {
    notFound();
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/clubs/${encodeURIComponent(clubId)}`)}`);
  }

  const { data: rawRows, error } = await supabase.rpc("get_club_members", {
    p_club_id: clubId,
    p_limit: 48,
    p_offset: 0,
    p_viewer_id: user.id,
  });

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-mca-md">
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error.message}
        </p>
        <Link href="/profile" className="mt-mca-md inline-block text-mca-caption text-mca-accent-strong">
          Back to profile
        </Link>
      </main>
    );
  }

  const members = (Array.isArray(rawRows) ? rawRows : []) as MemberRow[];
  const ids = members.map((m) => m.user_id).filter(Boolean);
  const presenceBy = ids.length > 0 ? await loadSocialPresenceByUserIds(supabase, ids) : {};

  let stripBy = new Map<string, number[]>();
  if (ids.length > 0) {
    const { data: stripRows } = await supabase.rpc("get_users_activity_recent_days_batch", {
      p_user_ids: ids,
      p_days: 30,
    });
    for (const sr of stripRows ?? []) {
      const r = sr as { user_id?: string; counts?: unknown };
      if (!r.user_id || !Array.isArray(r.counts)) continue;
      stripBy.set(
        r.user_id,
        r.counts.map((n) => (typeof n === "number" ? n : Number(n)))
      );
    }
  }

  const gradient = HEADER_RING[club.colorToken] ?? "from-mca-border/30";

  return (
    <main className="mx-auto max-w-4xl space-y-mca-lg p-mca-md pb-[max(4rem,env(safe-area-inset-bottom))]">
      <nav className="text-mca-caption">
        <Link href="/profile" className="text-mca-accent-strong hover:underline">
          Profile
        </Link>
        <span className="text-mca-ink-subtle"> / </span>
        <span className="text-mca-ink-muted">Clubs</span>
      </nav>

      <Panel className="overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface-elevated/60 shadow-mca-card">
        <div className={cn("h-1.5 w-full bg-gradient-to-r to-transparent", gradient)} />
        <div className="flex flex-wrap items-start gap-mca-md p-mca-md">
          <span className="text-4xl" aria-hidden>
            {club.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-mca-ink-strong">{club.displayName}</h1>
            <p className="mt-mca-xs max-w-2xl text-mca-body text-mca-ink-muted">{club.description}</p>
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">
              Cohorts are auto-assigned from public identity signals only — no leaderboards or in-club chat.
            </p>
          </div>
        </div>
      </Panel>

      <div className="max-w-xl">
        <CollectorQuickSearch defaultClubId={clubId} />
      </div>

      <CollectorRoomSurface roomType="club_room" topicKey={clubId} />
      <CollectorRoomsPanel contextRoomType="club_room" contextTopicKey={clubId} />

      <ClubActivityWave clubId={clubId} />

      <section>
        <h2 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Members ({members.length} shown)
        </h2>
        <ul className="mt-mca-md grid gap-mca-md sm:grid-cols-2">
          {members.map((m) => {
            const pr = presenceBy[m.user_id];
            const name =
              m.display_name?.trim() ||
              (m.handle?.trim() ? `@${m.handle.trim()}` : null) ||
              m.username?.trim() ||
              "Trainer";
            const sim =
              m.similarity_score != null && Number.isFinite(Number(m.similarity_score))
                ? Math.round(Number(m.similarity_score))
                : null;
            const strip = stripBy.get(m.user_id);
            return (
              <li key={m.user_id}>
                <Panel className="h-full rounded-mca-card border border-mca-border/80 bg-mca-surface/40 p-mca-md shadow-inner">
                  <div className="flex gap-mca-sm">
                    <Link
                      href={`/profile/${encodeURIComponent(m.user_id)}`}
                      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-chrome"
                    >
                      {m.avatar_url ? (
                        <Image
                          src={m.avatar_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={m.avatar_url.startsWith("data:")}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-mca-caption text-mca-ink-subtle">
                          —
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-mca-xs">
                        <Link
                          href={`/profile/${encodeURIComponent(m.user_id)}`}
                          className="truncate font-medium text-mca-ink-strong hover:underline"
                        >
                          {name}
                        </Link>
                        {pr ? (
                          <TrainerPresenceDot
                            lastSeenAt={pr.presenceOptOut ? null : pr.lastSeenAt}
                            lastActivityAt={pr.presenceOptOut ? null : pr.lastActivityAt}
                            lastActivityKey={pr.presenceOptOut ? null : pr.lastActivityRaw}
                            presenceOptOut={pr.presenceOptOut}
                            className="shrink-0"
                          />
                        ) : null}
                      </div>
                      {m.persona_text?.trim() ? (
                        <p className="mt-mca-trace line-clamp-2 text-mca-caption text-mca-ink-subtle">
                          {m.persona_text.trim()}
                        </p>
                      ) : null}
                      {sim != null ? (
                        <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
                          Similarity to you: <span className="tabular-nums font-semibold">{sim}</span>
                        </p>
                      ) : null}
                      {strip && strip.length > 0 ? (
                        <MiniActivityStrip counts={strip} className="mt-mca-sm max-w-[220px]" />
                      ) : null}
                    </div>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
        {members.length === 0 ? (
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">No members in this cohort yet.</p>
        ) : null}
      </section>
    </main>
  );
}
