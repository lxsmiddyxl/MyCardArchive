import { randomUUID } from "crypto";
import { MCA_CONTEXT_HEADER } from "@/lib/api/route-helpers";

export const MCA_TRACE_HEADER = "x-mca-trace-id" as const;

const SLOW_API_MS = 2_000;
const SLOW_QUERY_MS = 1_500;

export function createTraceId(): string {
  return randomUUID();
}

export function traceIdFromRequest(request: Request): string {
  return (
    request.headers.get(MCA_TRACE_HEADER)?.trim() ||
    request.headers.get(MCA_CONTEXT_HEADER)?.trim() ||
    createTraceId()
  );
}

export function withTraceHeaders(
  traceId: string,
  init?: ResponseInit
): ResponseInit {
  const headers = new Headers(init?.headers ?? undefined);
  headers.set(MCA_TRACE_HEADER, traceId);
  headers.set(MCA_CONTEXT_HEADER, traceId);
  return { ...init, headers };
}

export function logApiTiming(route: string, ms: number, traceId?: string): void {
  const level = ms >= SLOW_API_MS ? "warn" : "info";
  void import("@/mca-utils/logging/logger").then(({ logStructured }) => {
    logStructured(level, "api.timing", { route, ms, traceId });
  });
}

export function logSlowSupabaseQuery(
  operation: string,
  ms: number,
  traceId?: string
): void {
  if (ms < SLOW_QUERY_MS) return;
  void import("@/mca-utils/logging/logger").then(({ logStructured }) => {
    logStructured("warn", "supabase.slow_query", { operation, ms, traceId });
  });
}
