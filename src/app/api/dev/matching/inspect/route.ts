import { enrichUserMatchPhase2 } from "@/lib/matching/scoring";
import type { UserMatch } from "@/lib/matching/types";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Dev-only: Phase 2 scoring breakdown (no DB). */
async function GET_handler(): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base: UserMatch = {
    userId: "sample-partner",
    overlapCount: 4,
    score: 12,
    matchingCards: [{ cardId: "c1", quantity: 2, name: "Pikachu" }],
    reverseMatchingCards: [{ cardId: "c2", quantity: 1, name: "Mewtwo" }],
  };

  const enriched = enrichUserMatchPhase2(base, {
    myHave: [{ card_id: "c1", quantity: 3 }],
    myWant: [{ card_id: "c2", quantity: 2 }],
    theirHave: [{ card_id: "c2", quantity: 1 }],
    theirWant: [{ card_id: "c1", quantity: 2 }],
  });

  return NextResponse.json({
    description:
      "Phase 2 adds compatibilityScore (0–100), collectionOverlap (Jaccard on indexed ids), and tradePotential (score × log overlap).",
    sampleBase: base,
    sampleEnriched: enriched,
  });
}

export const GET = defineRouteNoArgs("GET /api/dev/matching/inspect", GET_handler);
