import "server-only";

import { mcaLog } from "@/lib/logging/mca-log-server";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type StructuredLogFields = Record<string, unknown>;

const DEFAULT_CTX = { componentName: "mca.logger", surfaceName: "server" } as const;

/**
 * JSON-shaped structured logging for production (stdout / Vercel log drain).
 */
export function logStructured(
  level: LogLevel,
  message: string,
  fields: StructuredLogFields = {},
  ctx: { componentName?: string; surfaceName?: string } = {}
): void {
  const telemetry = {
    componentName: ctx.componentName ?? DEFAULT_CTX.componentName,
    surfaceName: ctx.surfaceName ?? DEFAULT_CTX.surfaceName,
  };
  const payload = { message, level, ts: new Date().toISOString(), ...fields };

  switch (level) {
    case "error":
      mcaLog.error(message, payload, telemetry);
      break;
    case "warn":
      mcaLog.warn(message, payload, telemetry);
      break;
    case "debug":
      mcaLog.info(message, payload, telemetry);
      break;
    default:
      mcaLog.info(message, payload, telemetry);
  }
}
