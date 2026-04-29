import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/**
 * Placeholder for future server-side public deck view analytics (e.g. RPC increment).
 * No DB writes without a migration — returns 204 so clients can beacon safely.
 */
export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
  _context: { params: Record<string, string> }
) {
  void _context.params?.deckId;
  return new NextResponse(null, { status: 204 });
}

export const POST = defineRoute(
  "POST /api/public/decks/[deckId]/view",
  POST_handler
);
