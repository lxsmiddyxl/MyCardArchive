/**
 * Reputation v4 — trust graph blend (Phase 87).
 * Transparent, non-punitive; combines v3, follow edges, and trade reliability.
 */

import { trustScoreV3, type ReputationV3Inputs } from "@/lib/reputation/reputation-v3";

export type TrustEdgeDTO = {
  fromUserId: string;
  toUserId: string;
  weight: number;
};

export type TrustGraphV4DTO = {
  userId: string;
  trustScoreV4: number;
  edges: TrustEdgeDTO[];
  components: {
    reputationV3: number;
    followBoost: number;
    tradeReliability: number;
  };
};

export type TrustGraphV4Inputs = ReputationV3Inputs & {
  userId: string;
  /** Users this profile follows (outbound edges). */
  followingIds: string[];
  /** Users who follow this profile (inbound edges). */
  followerIds: string[];
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildTrustEdges(input: TrustGraphV4Inputs): TrustEdgeDTO[] {
  const edges: TrustEdgeDTO[] = [];
  for (const to of input.followingIds) {
    edges.push({ fromUserId: input.userId, toUserId: to, weight: 0.42 });
  }
  for (const from of input.followerIds) {
    if (input.followingIds.includes(from)) {
      edges.push({ fromUserId: from, toUserId: input.userId, weight: 0.58 });
    } else {
      edges.push({ fromUserId: from, toUserId: input.userId, weight: 0.28 });
    }
  }
  return edges.slice(0, 120);
}

export function trustScoreV4(input: TrustGraphV4Inputs): TrustGraphV4DTO {
  const reputationV3 = trustScoreV3(input);
  const mutual = input.followerIds.filter((id) => input.followingIds.includes(id)).length;
  const followBoost = clamp01(
    Math.min(1, input.followingIds.length / 80) * 0.04 +
      Math.min(1, input.followerIds.length / 80) * 0.04 +
      Math.min(1, mutual / 20) * 0.06
  );
  const denom = Math.max(1, input.trades_total);
  const tradeReliability = clamp01(input.trades_completed / denom) * 0.08;
  const edgeMean =
    buildTrustEdges(input).reduce((acc, e) => acc + e.weight, 0) /
    Math.max(1, buildTrustEdges(input).length);
  const edgeBoost = clamp01(edgeMean) * 0.05;

  const trustScore = clamp01(reputationV3 + followBoost + tradeReliability + edgeBoost);

  return {
    userId: input.userId,
    trustScoreV4: trustScore,
    edges: buildTrustEdges(input),
    components: {
      reputationV3,
      followBoost,
      tradeReliability,
    },
  };
}
