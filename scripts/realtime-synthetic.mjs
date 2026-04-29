/**
 * Phase 49 — Synthetic realtime broadcast stress (anon Supabase client).
 * Emits self-echo broadcasts and measures latency, gaps, and ordering.
 */

import { createClient } from "@supabase/supabase-js";

export const STALL_MS = 120_000;

/**
 * @param {object} opts
 * @param {string} [opts.supabaseUrl]
 * @param {string} [opts.anonKey]
 * @param {number} [opts.eventsPerSec=8]
 * @param {number} [opts.durationSec=6]
 */
export async function runRealtimeSynthetic(opts = {}) {
  const eventsPerSec = opts.eventsPerSec ?? 8;
  const durationSec = opts.durationSec ?? 6;

  const url = opts.supabaseUrl?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = opts.anonKey?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_supabase_env",
      latencyMs: null,
      p50LatencyMs: null,
      maxLatencyMs: 0,
      sent: 0,
      received: 0,
      missed: 0,
      outOfOrder: 0,
    };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const channelName = `stability-synthetic-${Date.now()}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: true } },
  });

  /** @type {number[]} */
  const latencies = [];
  /** @type {number[]} */
  const receivedSeq = [];
  let lastSeq = -1;
  let outOfOrder = 0;

  await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("subscribe_timeout")), 25000);
    channel.on("broadcast", { event: "stability-ping" }, (msg) => {
      const p = msg?.payload ?? msg;
      const now = Date.now();
      if (p && typeof p.seq === "number" && typeof p.tSent === "number") {
        latencies.push(now - p.tSent);
        if (p.seq < lastSeq) outOfOrder += 1;
        lastSeq = Math.max(lastSeq, p.seq);
        receivedSeq.push(p.seq);
      }
    });
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(to);
        resolve(undefined);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(to);
        reject(err ?? new Error(String(status)));
      }
    });
  });

  const total = Math.max(1, Math.floor(durationSec * eventsPerSec));
  const delayMs = 1000 / eventsPerSec;
  let sent = 0;

  for (let i = 0; i < total; i++) {
    const tSent = Date.now();
    const sendStatus = await channel.send({
      type: "broadcast",
      event: "stability-ping",
      payload: { seq: i, tSent },
    });
    if (sendStatus !== "ok") {
      await supabase.removeChannel(channel);
      throw new Error(`broadcast_send_failed:${sendStatus}`);
    }
    sent += 1;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  await new Promise((r) => setTimeout(r, Math.min(2500, 300 + sent * 8)));

  await supabase.removeChannel(channel);

  const received = receivedSeq.length;
  const missed = Math.max(0, sent - received);
  latencies.sort((a, b) => a - b);
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const maxLatencyMs = latencies.length ? latencies[latencies.length - 1] : 0;
  const stall = maxLatencyMs > STALL_MS;
  const ok =
    !stall && missed === 0 && outOfOrder === 0 && sent > 0 && received > 0;

  return {
    ok,
    skipped: false,
    latencyMs: p50,
    p50LatencyMs: p50,
    maxLatencyMs,
    stall,
    sent,
    received,
    missed,
    outOfOrder,
  };
}
