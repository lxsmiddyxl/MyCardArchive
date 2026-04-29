import "server-only";

import { createMcaLog } from "@/lib/logging/mca-log-factory";
import { pushMcaTelemetry } from "@/lib/server/mca-telemetry-buffer";

/** Server-side structured logging (API routes, server components, loaders). */
export const mcaLog = createMcaLog(pushMcaTelemetry);
