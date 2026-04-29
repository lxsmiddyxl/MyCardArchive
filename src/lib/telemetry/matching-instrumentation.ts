import "server-only";

import type { UserMatch } from "@/lib/matching/types";
import { logger } from "@/lib/telemetry/logger";

function sampleCardIdFromMatches(matches: UserMatch[]): string | null {
  const m = matches[0];
  if (!m) return null;
  return m.matchingCards[0]?.cardId ?? m.reverseMatchingCards[0]?.cardId ?? null;
}

/**
 * Wraps matching list queries with attempt / refresh / success / failure telemetry and latency.
 */
export async function withMatchingTelemetry(
  route: string,
  userId: string,
  run: () => Promise<UserMatch[]>
): Promise<UserMatch[]> {
  const t0 = Date.now();
  logger.debug({
    eventType: "match.attempt",
    userId,
    success: true,
    payloadSummary: { route },
  });
  try {
    const matches = await run();
    const latencyMs = Date.now() - t0;
    const cardId = sampleCardIdFromMatches(matches);
    const meta = { route, matchCount: matches.length, cardId };
    logger.info({
      eventType: "match.refresh",
      userId,
      success: true,
      latencyMs,
      payloadSummary: meta,
    });
    if (matches.length > 0) {
      logger.info({
        eventType: "match.success",
        userId,
        success: true,
        latencyMs,
        payloadSummary: meta,
      });
      const withScores = matches.filter((m) => m.compatibilityScore != null);
      if (withScores.length > 0) {
        const avgCompat =
          withScores.reduce((s, m) => s + (m.compatibilityScore ?? 0), 0) / withScores.length;
        const maxTp = Math.max(...matches.map((m) => m.tradePotential ?? 0));
        logger.info({
          eventType: "matching.score.compute",
          userId,
          success: true,
          latencyMs,
          payloadSummary: {
            route,
            matchCount: matches.length,
            avgCompatibility: Math.round(avgCompat * 10) / 10,
            maxTradePotential: Math.round(maxTp * 10) / 10,
          },
        });
      }
    }
    return matches;
  } catch (e) {
    logger.warn({
      eventType: "match.failure",
      userId,
      success: false,
      latencyMs: Date.now() - t0,
      payloadSummary: {
        route,
        error: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}
