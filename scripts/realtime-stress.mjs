/**
 * Phase 17 — Realtime stress & load simulation (DEV ONLY).
 *
 * Generates high-volume postgres_changes + presence activity against your Supabase project.
 * Requires service role (bypasses RLS). Do not run against production.
 *
 * Usage (PowerShell, from repo root):
 *   $env:REALTIME_STRESS="1"
 *   $env:SUPABASE_URL="https://....supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   $env:STRESS_USER_ID="<uuid>"           # profile id receiving notifications + index rows
 *   $env:STRESS_TRADE_ID="<uuid>"          # optional: existing trade to hammer with status updates
 *   node scripts/realtime-stress.mjs
 *
 * Optional:
 *   NOTIFICATION_COUNT=120   (50–200 typical)
 *   TRADE_UPDATES=80
 *   INDEX_UPDATES=100
 *   PRESENCE_BURSTS=40
 *   CLEANUP=1                delete stress notifications (type=stress_test) when done
 *
 * npm: `npm run stress:realtime` (still requires env vars above; exits unless REALTIME_STRESS=1).
 *
 * After Phase 17 validation, you may delete this file or keep it gated as above.
 */

import { createClient } from "@supabase/supabase-js";

const REALTIME_SUBSCRIBED = "SUBSCRIBED";

function mustEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

function intEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run: NODE_ENV is production.");
    process.exit(1);
  }

  if (process.env.REALTIME_STRESS !== "1") {
    console.log(
      "Skipped: set REALTIME_STRESS=1 to run the realtime stress harness (dev-only)."
    );
    process.exit(0);
  }

  const url = mustEnv("SUPABASE_URL");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userId = mustEnv("STRESS_USER_ID");

  const notificationCount = Math.min(200, Math.max(50, intEnv("NOTIFICATION_COUNT", 120)));
  const tradeUpdates = intEnv("TRADE_UPDATES", 80);
  const indexUpdates = intEnv("INDEX_UPDATES", 100);
  const presenceBursts = intEnv("PRESENCE_BURSTS", 40);

  const tradeId = process.env.STRESS_TRADE_ID?.trim() || "";

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const statuses = ["draft", "sent", "countered", "sent", "accepted", "countered", "completed"];

  console.log("Realtime stress — starting");
  console.log({
    notificationCount,
    tradeUpdates,
    indexUpdates,
    presenceBursts,
    tradeId: tradeId || "(skipped)",
  });

  /** @type {{ step: string; ms: number }[]} */
  const timings = [];

  function mark(step) {
    timings.push({ step, ms: performance.now() });
  }

  mark("start");

  // --- Fetch one card for index upserts ---
  const { data: cards, error: cardErr } = await supabase.from("cards").select("id").limit(1);
  if (cardErr || !cards?.length) {
    console.error("Need at least one row in public.cards for index stress:", cardErr);
    process.exit(1);
  }
  const cardId = cards[0].id;
  mark("card_fetch");

  // --- Notifications: batched inserts ---
  const batchSize = 40;
  let inserted = 0;
  for (let offset = 0; offset < notificationCount; offset += batchSize) {
    const n = Math.min(batchSize, notificationCount - offset);
    const rows = Array.from({ length: n }, (_, i) => ({
      user_id: userId,
      type: "stress_test",
      title: `Stress notification ${offset + i}`,
      body: "Phase 17 load simulation",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      console.error("notifications insert failed:", error);
      process.exit(1);
    }
    inserted += n;
  }
  mark("notifications_done");
  console.log(`Inserted ${inserted} notifications.`);

  // --- Trade status rapid updates ---
  if (tradeId) {
    const parallel = 8;
    for (let round = 0; round < Math.ceil(tradeUpdates / parallel); round++) {
      const chunk = Math.min(parallel, tradeUpdates - round * parallel);
      const ops = [];
      for (let i = 0; i < chunk; i++) {
        const idx = round * parallel + i;
        const status = statuses[idx % statuses.length];
        ops.push(
          supabase
            .from("trades")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", tradeId)
        );
      }
      const results = await Promise.all(ops);
      for (const r of results) {
        if (r.error) {
          console.error("trade update failed:", r.error);
          process.exit(1);
        }
      }
    }
    mark("trades_done");
    console.log(`Applied ${tradeUpdates} trade status updates.`);
  } else {
    mark("trades_skipped");
    console.log("Skipped trade updates (set STRESS_TRADE_ID).");
  }

  // --- Matching index: alternate haves / wants upserts ---
  for (let i = 0; i < indexUpdates; i++) {
    const table = i % 2 === 0 ? "user_havelist_index" : "user_wantlist_index";
    const quantity = (i % 9) + 1;
    const { error } = await supabase.from(table).upsert(
      {
        user_id: userId,
        card_id: cardId,
        quantity,
      },
      { onConflict: "user_id,card_id" }
    );
    if (error) {
      console.error(`${table} upsert failed:`, error);
      process.exit(1);
    }
  }
  mark("index_done");
  console.log(`Applied ${indexUpdates} matching index upserts (haves/wants alternated).`);

  // --- Presence join/leave bursts (same topic pattern as the app: presence:<name>) ---
  let presenceOk = 0;
  for (let i = 0; i < presenceBursts; i++) {
    const topic = i % 3 === 0 ? "online-users" : `stress-burst-${i % 5}`;
    const channel = supabase.channel(`presence:${topic}`, {
      config: { presence: { key: `stress-${i}` } },
    });

    try {
      await new Promise((resolve, reject) => {
        const to = setTimeout(() => {
          reject(new Error("presence subscribe timeout (15s)"));
        }, 15000);
        channel.subscribe((status, err) => {
          if (status === REALTIME_SUBSCRIBED) {
            clearTimeout(to);
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(to);
            reject(err ?? new Error(String(status)));
          }
        });
      });

      const trackRes = await channel.track({
        user_id: userId,
        stress_index: i,
        at: new Date().toISOString(),
      });
      if (trackRes !== "ok") {
        console.warn("presence track:", trackRes);
      }
      await channel.untrack();
      await supabase.removeChannel(channel);
      presenceOk += 1;
    } catch (e) {
      console.warn(`presence burst ${i} (${topic}):`, e?.message ?? e);
      try {
        await supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }
  }
  mark("presence_done");
  console.log(`Presence bursts: ${presenceOk}/${presenceBursts} completed.`);

  // --- Optional cleanup of notification rows ---
  if (process.env.CLEANUP === "1") {
    const { error: delErr } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("type", "stress_test");
    if (delErr) console.warn("Cleanup delete:", delErr);
    else console.log("Cleaned up stress_test notifications for user.");
  }

  mark("end");

  const summary = [];
  for (let i = 1; i < timings.length; i++) {
    const dt = timings[i].ms - timings[i - 1].ms;
    summary.push(`${timings[i].step}: ${dt.toFixed(0)}ms`);
  }
  console.log("\n--- Timings (incremental) ---");
  console.log(summary.join("\n"));
  console.log(
    `\nTotal: ${(timings[timings.length - 1].ms - timings[0].ms).toFixed(0)}ms\n`
  );

  console.log("Stress run finished.");
  console.log(
    "Manual checks: with the app open in dev, confirm devtools show rising event counts,"
  );
  console.log(
    "no tab freeze, and UI remains responsive (debounced refetches may batch updates)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
