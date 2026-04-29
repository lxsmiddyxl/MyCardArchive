import type { McaLogContext, McaLogEnvelope, McaLogLevel } from "@/lib/logging/types";

function buildEnvelope(
  level: McaLogLevel,
  name: string,
  data: Record<string, unknown>,
  ctx: McaLogContext
): McaLogEnvelope {
  return {
    level,
    name,
    data,
    ts: Date.now(),
    componentName: ctx.componentName,
    surfaceName: ctx.surfaceName,
    ...(ctx.traceId ? { traceId: ctx.traceId } : {}),
  };
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { message: err.message, name: err.name };
  }
  return { message: String(err) };
}

export function createMcaLog(push: (env: McaLogEnvelope) => void) {
  return {
    info(name: string, data: Record<string, unknown>, ctx: McaLogContext) {
      push(buildEnvelope("info", name, data, ctx));
    },
    warn(name: string, data: Record<string, unknown>, ctx: McaLogContext) {
      push(buildEnvelope("warn", name, data, ctx));
    },
    error(
      name: string,
      data: Record<string, unknown> & { err?: unknown },
      ctx: McaLogContext
    ) {
      const { err, ...rest } = data;
      const merged =
        err !== undefined
          ? { ...rest, error: serializeError(err) }
          : { ...rest };
      push(buildEnvelope("error", name, merged, ctx));
    },
    event(name: string, data: Record<string, unknown>, ctx: McaLogContext) {
      push(buildEnvelope("event", name, data, ctx));
    },
    timing(name: string, data: Record<string, unknown>, ctx: McaLogContext) {
      push(buildEnvelope("timing", name, data, ctx));
    },
  };
}

export type McaLogApi = ReturnType<typeof createMcaLog>;
