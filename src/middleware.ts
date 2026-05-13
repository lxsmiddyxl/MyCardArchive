import { type NextRequest, NextResponse } from "next/server";
import {
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/server/rate-limit-api";
import { updateSession } from "@/lib/supabase/middleware";

/** Edge-safe: `MAINTENANCE_MODE=true|1|yes` (Phase 47). See `docs/runbooks/maintenance-mode.md`. */
function isMaintenanceModeEnabled(): boolean {
  const v = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (isMaintenanceModeEnabled()) {
    const allow =
      pathname === "/maintenance" ||
      pathname.startsWith("/maintenance/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/health") ||
      pathname.startsWith("/api/internal/stability") ||
      pathname.startsWith("/api/internal/recovery");
    if (!allow) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable", code: "MAINTENANCE" },
          {
            status: 503,
            headers: { "Retry-After": "120", "Cache-Control": "no-store" },
          }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }
  }

  if (pathname === "/api/cards/search" && method === "GET") {
    const blocked = rateLimitedResponse(
      request,
      "cards-search",
      RATE_LIMITS.cardsSearch
    );
    if (blocked) return blocked;
  }

  if (pathname === "/api/community/posts" && method === "POST") {
    const blocked = rateLimitedResponse(
      request,
      "community-post-mut",
      RATE_LIMITS.communityPostMutation
    );
    if (blocked) return blocked;
  }

  if (
    pathname.startsWith("/api/cards") &&
    pathname !== "/api/cards/search" &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "cards-mut",
      RATE_LIMITS.cardsMutation
    );
    if (blocked) return blocked;
  }

  if (
    pathname.startsWith("/api/trades") &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "trades-mut",
      RATE_LIMITS.tradesMutation
    );
    if (blocked) return blocked;
  }

  if (
    (pathname === "/api/scan" ||
      pathname === "/api/scan/v1" ||
      pathname === "/api/scan/v2") &&
    method === "POST"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "scan-mut",
      RATE_LIMITS.scanMutation
    );
    if (blocked) return blocked;
  }

  if (pathname.startsWith("/api/matching/") && method === "GET") {
    const blocked = rateLimitedResponse(
      request,
      "matching-read",
      RATE_LIMITS.matchingReads
    );
    if (blocked) return blocked;
  }

  if (pathname === "/api/log" && method === "POST") {
    const blocked = rateLimitedResponse(
      request,
      "log-ingest",
      RATE_LIMITS.logIngest
    );
    if (blocked) return blocked;
  }

  if (
    pathname.startsWith("/api/billing") &&
    !pathname.startsWith("/api/billing/webhook") &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "billing-mut",
      RATE_LIMITS.billingMutation
    );
    if (blocked) return blocked;
  }

  if (
    pathname.startsWith("/api/decks") &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "deck-mut",
      RATE_LIMITS.deckMutation
    );
    if (blocked) return blocked;
  }

  if (
    pathname.startsWith("/api/binders") &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "binder-mut",
      RATE_LIMITS.binderMutation
    );
    if (blocked) return blocked;
  }

  if (
    pathname.includes("/api/public/decks/") &&
    pathname.endsWith("/view") &&
    method === "POST"
  ) {
    const blocked = rateLimitedResponse(
      request,
      "pub-deck-view",
      RATE_LIMITS.publicDeckView
    );
    if (blocked) return blocked;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
