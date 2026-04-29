"use client";

import { DiscoveryFeedClient } from "@/components/matching/discovery-feed-client";
import { MatchCard } from "@/components/matching/match-card";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { MatchCardCompactSkeleton } from "@/components/ui/skeleton";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import {
  fetchTopMatches,
  fetchWhoHasWhatIWant,
  fetchWhoWantsMyCards,
} from "@/lib/matching/client-api";
import { MATCHING_INDEX_REFETCH_DEBOUNCE_MS } from "@/lib/matching/realtime";
import type { UserMatch } from "@/lib/matching/types";
import {
  devtoolsDebounceArm,
  devtoolsDebounceClear,
  devtoolsDebounceFire,
  devtoolsSilentRefetch,
} from "@/lib/dev/realtime-devtools-state";
import { log } from "@/lib/logging/log";
import {
  getPresenceMemberCountSync,
  joinPresence,
  leavePresence,
  presenceMatchingHub,
  subscribeToPresence,
  getRealtimePostgresClient,
  subscribeToMatchingIndex,
} from "@/lib/realtime/channels";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { cn } from "@/lib/ui/cn";
import { useMicroFlash } from "@/lib/ui/use-micro-flash";
import {
  useRealtimeEventCounter,
  useSuspenseProfile,
} from "@/lib/telemetry";
import { FtueOverlay } from "@/components/onboarding/ftue-overlay";
import { SafeModePanel } from "@/components/system/safe-mode-panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { LKG_KEY, lkgGet, lkgSet } from "@/lib/offline/surface-lkg";
import { useSafeModeGate } from "@/lib/hooks/use-safe-mode-gate";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import Link from "next/link";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MATCH_VIRTUAL_THRESHOLD = 12;

const MatchSection = memo(function MatchSection({
  title,
  description,
  matches,
  loading,
  emptyHint,
  listAriaLabel,
}: {
  title: string;
  description: string;
  matches: UserMatch[];
  loading: boolean;
  emptyHint: string;
  listAriaLabel: string;
}) {
  const telemetry = useMemo(
    () =>
      ({
        name: `match-${title.slice(0, 24)}`,
        ctx: {
          componentName: "MatchSection",
          surfaceName: "matching",
        },
      }) as const,
    [title]
  );

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">{title}</p>
      <p className="mt-mca-xs text-mca-caption text-mca-hint">{description}</p>
      {loading ? (
        <div className="mt-mca-md space-y-mca-sm" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading matches</span>
          <p className="text-mca-body text-mca-ink-muted">Loading…</p>
          <MatchCardCompactSkeleton />
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-subtle">{emptyHint}</p>
      ) : matches.length >= MATCH_VIRTUAL_THRESHOLD ? (
        <div className="mt-mca-md min-h-0 max-h-[min(55vh,480px)]">
          <McaVirtualList
            items={matches}
            ariaLabel={listAriaLabel}
            estimateSize={120}
            overscan={6}
            getItemKey={(m) => m.userId}
            renderItem={(m) => (
              <div role="listitem" className="pb-mca-sm">
                <MatchCard match={m} variant="compact" />
              </div>
            )}
            className="min-h-0 max-h-[min(55vh,480px)]"
            telemetry={telemetry}
          />
        </div>
      ) : (
        <ul className="mt-mca-md space-y-mca-sm">
          {matches.map((m) => (
            <li key={`${title}-${m.userId}`}>
              <MatchCard match={m} variant="compact" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
});

export function MatchingDashboardClient({ userId }: { userId: string }) {
  return (
    <AuthenticatedPresenceShell userId={userId}>
      <MatchingDashboardBody userId={userId} />
    </AuthenticatedPresenceShell>
  );
}

function MatchingDashboardBody({ userId }: { userId: string }) {
  const [whoWant, setWhoWant] = useState<UserMatch[]>([]);
  const [whoHas, setWhoHas] = useState<UserMatch[]>([]);
  const [top, setTop] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { active: matchFlashActive, trigger: triggerMatchFlash } = useMicroFlash(200);
  const safeGate = useSafeModeGate({ surfaceName: "matching", maxFailures: 3 });

  const telemetryCtx = useMemo(
    () => ({
      componentName: "MatchingDashboardClient",
      surfaceName: "matching",
    }),
    []
  );
  useSuspenseProfile("matching-dashboard", telemetryCtx);
  const rtInc = useRealtimeEventCounter("matching-index", telemetryCtx);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [a, b, c] = await Promise.all([
        fetchWhoWantsMyCards(),
        fetchWhoHasWhatIWant(),
        fetchTopMatches(24),
      ]);
      if (!a.ok) throw new Error(a.error);
      if (!b.ok) throw new Error(b.error);
      if (!c.ok) throw new Error(c.error);
      if (opts?.silent) {
        startTransition(() => {
          setWhoWant(a.matches);
          setWhoHas(b.matches);
          setTop(c.matches);
        });
        triggerMatchFlash();
      } else {
        setWhoWant(a.matches);
        setWhoHas(b.matches);
        setTop(c.matches);
      }
      lkgSet(LKG_KEY.matching, {
        whoWant: a.matches,
        whoHas: b.matches,
        top: c.matches,
      });
      safeGate.onLoadSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load matching data";
      if (!opts?.silent) {
        const snap = lkgGet<{
          whoWant: UserMatch[];
          whoHas: UserMatch[];
          top: UserMatch[];
        }>(LKG_KEY.matching);
        if (
          snap &&
          (snap.whoWant?.length > 0 || snap.whoHas?.length > 0 || snap.top?.length > 0)
        ) {
          setWhoWant(snap.whoWant ?? []);
          setWhoHas(snap.whoHas ?? []);
          setTop(snap.top ?? []);
          mcaLog.event(
            "offline.lkg.restore",
            { surface: "matching", key: "matching-index" },
            telemetryCtx
          );
          setError("You're offline or the request failed — showing last loaded matches.");
          safeGate.onLoadSuccess();
        } else {
          setError(msg);
          safeGate.onLoadFailure({ message: msg });
        }
      } else {
        safeGate.onLoadFailure({ message: msg });
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [triggerMatchFlash, safeGate, telemetryCtx]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const [discoveryPeers, setDiscoveryPeers] = useState(0);

  useEffect(() => {
    const topic = presenceMatchingHub();
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user || user.id !== userId) return;
      let joined = false;
      try {
        await joinPresence(topic, {
          user_id: user.id,
          surface: "matching_discovery",
        });
        joined = true;
      } catch {
        /* realtime unavailable */
      }
      if (!joined) return;
      unsub = subscribeToPresence(topic, {
        onSync: () => {
          const n = getPresenceMemberCountSync(topic);
          setDiscoveryPeers(Math.max(0, n - 1));
        },
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
      void leavePresence(topic);
    };
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleReload = () => {
      rtInc();
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("matching-dashboard");
      devtoolsDebounceArm("matching-dashboard", "matching-dashboard", MATCHING_INDEX_REFETCH_DEBOUNCE_MS);
      debounceTimer = setTimeout(() => {
        devtoolsDebounceFire("matching-dashboard");
        devtoolsSilentRefetch("matching-dashboard");
        log.matching.debug("index.silent_reload", { source: "matching-dashboard" });
        void loadRef.current({ silent: true });
      }, MATCHING_INDEX_REFETCH_DEBOUNCE_MS);
    };

    void (async () => {
      const {
        data: { user },
      } = await getRealtimePostgresClient().auth.getUser();
      if (cancelled || !user) return;
      unsub = subscribeToMatchingIndex(user.id, scheduleReload);
    })();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("matching-dashboard");
      unsub?.();
    };
  }, [rtInc]);

  return (
    <div
      className={cn(
        "space-y-mca-lg rounded-mca-card transition-[box-shadow,background-color] duration-200 ease-mca-standard",
        matchFlashActive && "bg-mca-success-bold/[0.03] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.1)]"
      )}
    >
      <div className="flex flex-col gap-mca-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Matching</p>
          <div className="flex flex-wrap items-center gap-mca-sm">
            {discoveryPeers > 0 ? (
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-mca-accent-strong/30 bg-mca-accent-strong/15 text-mca-caption font-semibold text-mca-accent/95"
                title={`${discoveryPeers} other trainer(s) viewing discovery`}
                aria-label={`${discoveryPeers} other trainers viewing matching discovery`}
              >
                +{discoveryPeers}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-mca-md gap-y-mca-xs">
            <h1 className="text-mca-display text-mca-ink-strong">Trade discovery</h1>
            <span
              className={cn(
                "text-mca-caption font-medium text-mca-success/90 transition-opacity duration-200 ease-mca-standard",
                matchFlashActive ? "opacity-100" : "opacity-0 pointer-events-none select-none"
              )}
              aria-hidden
            >
              Updated
            </span>
          </div>
          <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
            Find trainers whose want/have lists overlap with your collection. Use “New trade” and paste their user id
            to open an offer.
          </p>
        </div>
        <Link
          href="/trades"
          className="inline-flex shrink-0 items-center justify-center gap-mca-sm rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
        >
          Open trades
        </Link>
      </div>

      {error && !safeGate.safeMode ? <InlineError>{error}</InlineError> : null}
      {safeGate.safeMode ? (
        <SafeModePanel
          surfaceLabel="Matching"
          onRetry={() => {
            safeGate.leaveSafeMode();
            void load();
          }}
          onDismiss={() => safeGate.leaveSafeMode()}
        />
      ) : null}

      {!safeGate.safeMode ? (
        <>
          <MCAErrorBoundary
            componentName="DiscoveryFeedClient"
            surfaceName="discovery-feed"
            title="Discovery feed unavailable"
          >
            <DiscoveryFeedClient matches={top} loading={loading} />
          </MCAErrorBoundary>

          <div className="grid gap-mca-lg lg:grid-cols-2">
        <MatchSection
          title="Users who want your cards"
          description="They listed wants that match cards you have in your index."
          matches={whoWant}
          loading={loading}
          emptyHint="No one is looking for your indexed haves yet."
          listAriaLabel="Trainers who want cards you have"
        />
        <MatchSection
          title="Users who have what you want"
          description="They have cards you listed in your want index."
          matches={whoHas}
          loading={loading}
          emptyHint="No indexed matches for your wants yet."
          listAriaLabel="Trainers who have cards you want"
        />
          </div>
        </>
      ) : null}

      <FtueOverlay storageKey="mca:ftue:matching" surfaceName="matching" title="How matching works">
        <p>
          We compare your indexed haves and wants with other trainers. When you find a partner, start a trade from the
          Trades page with their user id.
        </p>
      </FtueOverlay>
    </div>
  );
}
