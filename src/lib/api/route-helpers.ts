import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiErrorCode, httpStatusToApiErrorCode } from "@/lib/api/api-error-codes";

export type RouteContext = { contextId: string; startedAt: number };

export function withContextId(): RouteContext {
  return { contextId: randomUUID(), startedAt: Date.now() };
}

function splitErrorExtra(extra?: Record<string, unknown>): {
  code?: (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
  meta: Record<string, unknown>;
} {
  if (!extra) return { meta: {} };
  const { code, ...meta } = extra as Record<string, unknown> & { code?: string };
  const c =
    typeof code === "string" && (Object.values(ApiErrorCode) as string[]).includes(code)
      ? (code as (typeof ApiErrorCode)[keyof typeof ApiErrorCode])
      : undefined;
  return { code: c, meta };
}

/**
 * Standard failure envelope: `{ ok: false, context_id, error: { code, message }, meta? }`.
 */
export function errorJson(
  ctx: RouteContext,
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  const { code: explicitCode, meta } = splitErrorExtra(extra);
  const code = explicitCode ?? httpStatusToApiErrorCode(status);
  const body: Record<string, unknown> = {
    ok: false,
    context_id: ctx.contextId,
    error: { code, message },
  };
  if (Object.keys(meta).length > 0) body.meta = meta;
  return NextResponse.json(body, { status });
}

/**
 * Standard success envelope: `{ ok: true, context_id, data }`.
 */
export function successJson<T extends Record<string, unknown>>(
  ctx: RouteContext,
  body: T,
  init?: ResponseInit
) {
  return NextResponse.json({ ok: true, context_id: ctx.contextId, data: body }, init);
}

/** Alias for `successJson` (Phase 28 naming). */
export const success = successJson;

/** Alias for `errorJson` (Phase 28 naming). */
export const failure = errorJson;

export function safeParseNumber(
  raw: string | null | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Supabase/Postgres messages can include internal detail. Avoid exposing them in production responses.
 */
export function safePublicDbMessage(internalMessage: string): string {
  if (process.env.NODE_ENV === "production") {
    return "Unable to complete this request. Try again.";
  }
  return internalMessage;
}

export async function validateSession(
  supabase: SupabaseClient,
  ctx: RouteContext
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: errorJson(ctx, "Unauthorized", 401, { code: ApiErrorCode.UNAUTHORIZED }),
    };
  }
  return { ok: true, userId: user.id };
}

export async function validateMultipart(
  request: Request,
  ctx: RouteContext
): Promise<{ ok: true; formData: FormData } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      response: errorJson(ctx, "Expected multipart/form-data", 400, { code: ApiErrorCode.BAD_REQUEST }),
    };
  }
  try {
    return { ok: true, formData: await request.formData() };
  } catch {
    return {
      ok: false,
      response: errorJson(ctx, "Invalid multipart body", 400, { code: ApiErrorCode.PAYLOAD_INVALID }),
    };
  }
}
