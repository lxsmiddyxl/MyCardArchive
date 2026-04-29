/**
 * Development-only stress / chaos harness for realtime + devtools observability.
 * Do not import from production UI paths — keep usage behind dev-only bundles (e.g. realtime devtools).
 */

import {
  devtoolsPostgresRetry,
  devtoolsPostgresRetryExhausted,
  devtoolsSilentRefetch,
} from "@/lib/dev/realtime-devtools-state";
import {
  DEV_CHAOS_POSTGRES_MUX_KEY,
  DEV_CHAOS_PRESENCE_TOPIC,
  devChaosAttachPostgresSink,
  devChaosEmitSyntheticPostgres,
  joinPresence,
  leavePresence,
} from "@/lib/realtime/channels";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const IS_DEV = process.env.NODE_ENV === "development";

/** Hard caps — prevents runaway work if options are misconfigured. */
export const CHAOS_MAX_BURST = 500;
export const CHAOS_MAX_PRESENCE_CYCLES = 80;
export const CHAOS_MAX_SILENT_REFETCH = 120;
export const CHAOS_MAX_MUX_RETRY_SIGNALS = 12;

export type ChaosRunOptions = {
  /** Synthetic postgres mux events (default 220). */
  burstCount?: number;
  /** join → leave cycles on isolated presence topic (default 32). */
  presenceCycles?: number;
  /** devtoolsSilentRefetch calls (default 48). */
  silentRefetchSpawns?: number;
  /** Synthetic mux retry / exhausted log lines (devtools overlay only; default 6). */
  muxRetrySignals?: number;
  /** Max ms injected between random operations (default 12). */
  maxJitterMs?: number;
  abortSignal?: AbortSignal;
  onLog?: (line: string) => void;
};

export type ChaosRunResult = {
  ok: boolean;
  message: string;
  stats?: {
    postgresEmitted: number;
    presenceCycles: number;
    silentRefetches: number;
    muxRetrySignals: number;
    ms: number;
  };
};

let running = false;
let runAbort: AbortController | null = null;

function log(line: string, onLog?: (l: string) => void): void {
  onLog?.(line);
  if (IS_DEV && typeof console !== "undefined") {
    console.info(`%c[MCA chaos]%c ${line}`, "color:#f472b6;font-weight:bold", "color:inherit");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomJitter(maxMs: number): Promise<void> {
  if (maxMs <= 0) return Promise.resolve();
  const ms = Math.floor(Math.random() * (maxMs + 1));
  return sleep(ms);
}

function makeSyntheticPayload(i: number): RealtimePostgresChangesPayload<Record<string, unknown>> {
  return {
    eventType: "INSERT",
    schema: "public",
    table: "trades",
    new: { id: `chaos-${i}`, synthetic: true, i },
  } as unknown as RealtimePostgresChangesPayload<Record<string, unknown>>;
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const err = new Error("Chaos aborted");
    err.name = "AbortError";
    throw err;
  }
}

/**
 * Abort an in-flight {@link runChaosLoadTest} (no-op if idle).
 */
export function abortChaosLoadTest(): void {
  runAbort?.abort();
}

export function isChaosLoadTestRunning(): boolean {
  return running;
}

/**
 * Runs a bounded, sequential stress profile:
 * 1) Postgres mux burst (synthetic emit through real mux `emit`)
 * 2) Random jitter between batches (keeps main thread responsive)
 * 3) Silent refetch devtools signals
 * 4) Synthetic mux retry / exhausted lines (devtools state only — does not corrupt real mux)
 * 5) Presence join/leave churn on {@link DEV_CHAOS_PRESENCE_TOPIC}
 *
 * Does not touch real DB rows. Does not trigger real Supabase mux reconnect timers beyond normal channel subscribe.
 */
export async function runChaosLoadTest(options: ChaosRunOptions = {}): Promise<ChaosRunResult> {
  if (!IS_DEV) {
    return { ok: false, message: "Chaos harness runs only in development." };
  }
  if (running) {
    return { ok: false, message: "Chaos run already in progress." };
  }

  const burstCount = Math.min(
    CHAOS_MAX_BURST,
    Math.max(0, options.burstCount ?? 220)
  );
  const presenceCycles = Math.min(
    CHAOS_MAX_PRESENCE_CYCLES,
    Math.max(0, options.presenceCycles ?? 32)
  );
  const silentRefetchSpawns = Math.min(
    CHAOS_MAX_SILENT_REFETCH,
    Math.max(0, options.silentRefetchSpawns ?? 48)
  );
  const muxRetrySignals = Math.min(
    CHAOS_MAX_MUX_RETRY_SIGNALS,
    Math.max(0, options.muxRetrySignals ?? 6)
  );
  const maxJitterMs = Math.min(80, Math.max(0, options.maxJitterMs ?? 12));

  const onLog = options.onLog;
  const outerSignal = options.abortSignal;
  const ac = new AbortController();
  runAbort = ac;

  const signal = (() => {
    if (!outerSignal) return ac.signal;
    if (outerSignal.aborted) {
      ac.abort();
      return ac.signal;
    }
    const onAbort = () => ac.abort();
    outerSignal.addEventListener("abort", onAbort, { once: true });
    return ac.signal;
  })();

  running = true;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  let postgresEmitted = 0;
  let unsubSink: (() => void) | undefined;

  try {
    log("start: attach postgres chaos sink", onLog);
    unsubSink = devChaosAttachPostgresSink(() => {
      /* no-op subscriber — burst drives fan-out cost */
    });

    assertNotAborted(signal);

    log(`postgres burst ×${burstCount}`, onLog);
    for (let i = 0; i < burstCount; i++) {
      assertNotAborted(signal);
      const ok = devChaosEmitSyntheticPostgres(makeSyntheticPayload(i));
      if (!ok) {
        return {
          ok: false,
          message: "Chaos sink missing — internal error (mux entry not created).",
        };
      }
      postgresEmitted += 1;
      if (i > 0 && i % 20 === 0) {
        await randomJitter(maxJitterMs);
        await sleep(0);
      }
    }

    assertNotAborted(signal);
    log(`silent refetch ×${silentRefetchSpawns}`, onLog);
    for (let i = 0; i < silentRefetchSpawns; i++) {
      assertNotAborted(signal);
      devtoolsSilentRefetch(`chaos:${i % 8}`);
      if (i % 16 === 0) await sleep(0);
    }

    assertNotAborted(signal);
    log(`synthetic mux retry signals ×${muxRetrySignals}`, onLog);
    for (let i = 0; i < muxRetrySignals; i++) {
      assertNotAborted(signal);
      const roll = Math.random();
      if (roll < 0.85) {
        devtoolsPostgresRetry(
          DEV_CHAOS_POSTGRES_MUX_KEY,
          (i % 3) + 1,
          [250, 500, 1000][i % 3]!,
          `chaos-synthetic-${i}`
        );
      } else {
        devtoolsPostgresRetryExhausted(DEV_CHAOS_POSTGRES_MUX_KEY, `chaos-exhausted-${i}`);
      }
      await randomJitter(Math.min(maxJitterMs, 6));
    }

    assertNotAborted(signal);
    log(`presence churn ×${presenceCycles} on ${DEV_CHAOS_PRESENCE_TOPIC}`, onLog);
    for (let c = 0; c < presenceCycles; c++) {
      assertNotAborted(signal);
      try {
        await joinPresence(DEV_CHAOS_PRESENCE_TOPIC, {
          user_id: "chaos-harness",
          cycle: c,
          at: new Date().toISOString(),
        });
        await randomJitter(maxJitterMs);
        await leavePresence(DEV_CHAOS_PRESENCE_TOPIC);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`presence cycle ${c} failed: ${msg}`, onLog);
        try {
          await leavePresence(DEV_CHAOS_PRESENCE_TOPIC);
        } catch {
          /* ignore */
        }
      }
      await randomJitter(maxJitterMs);
      if (c % 6 === 0) await sleep(0);
    }

    const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
    const ms = tEnd - t0;

    log(`done in ${ms.toFixed(0)}ms`, onLog);

    return {
      ok: true,
      message: "Chaos run completed.",
      stats: {
        postgresEmitted,
        presenceCycles,
        silentRefetches: silentRefetchSpawns,
        muxRetrySignals,
        ms,
      },
    };
  } catch (e) {
    const aborted =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) {
      log("aborted", onLog);
      return { ok: false, message: "Chaos run aborted." };
    }
    const msg = e instanceof Error ? e.message : String(e);
    log(`error: ${msg}`, onLog);
    return { ok: false, message: msg };
  } finally {
    unsubSink?.();
    running = false;
    runAbort = null;
  }
}
