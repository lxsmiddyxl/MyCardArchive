import { USE_REAL_MODEL } from "@/lib/ai/mock-scan";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/**
 * Temporary deployment / env verification hook for Phase 5 scanning.
 * Does not expose secret values—only booleans and static metadata.
 */
async function GET_handler() {
  const openaiKeyPresent = Boolean(
    process.env.OPENAI_API_KEY?.trim()?.length
  );
  const googleKeyPresent = Boolean(
    process.env.GOOGLE_API_KEY?.trim()?.length
  );

  return NextResponse.json({
    use_real_model: USE_REAL_MODEL,
    openai_key_configured: openaiKeyPresent,
    google_key_configured: googleKeyPresent,
    provider_ready:
      !USE_REAL_MODEL || openaiKeyPresent || googleKeyPresent,
    openai_vision_model:
      process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini (default)",
    gemini_vision_model:
      process.env.GEMINI_VISION_MODEL?.trim() || "gemini-1.5-flash (default)",
    node_env: process.env.NODE_ENV ?? "unknown",
    sample: {
      ok: true,
      message: "Scan test route is reachable",
    },
  });
}

export const GET = defineRouteNoArgs("GET /api/scan/test", GET_handler);
