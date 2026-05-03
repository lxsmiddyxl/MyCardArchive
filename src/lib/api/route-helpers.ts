import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RouteContext = { contextId: string; startedAt: number };

export function withContextId(): RouteContext {
  return { contextId: randomUUID(), startedAt: Date.now() };
}

export function errorJson(
  ctx: RouteContext,
  error: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { success: false, error, context_id: ctx.contextId, ...(extra ?? {}) },
    { status }
  );
}

export function successJson<T extends Record<string, unknown>>(
  ctx: RouteContext,
  body: T,
  init?: ResponseInit
) {
  return NextResponse.json({ success: true, context_id: ctx.contextId, ...body }, init);
}

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

export async function validateSession(
  supabase: SupabaseClient,
  ctx: RouteContext
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: errorJson(ctx, "Unauthorized", 401) };
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
      response: errorJson(ctx, "Expected multipart/form-data", 400),
    };
  }
  try {
    return { ok: true, formData: await request.formData() };
  } catch {
    return { ok: false, response: errorJson(ctx, "Invalid multipart body", 400) };
  }
}
