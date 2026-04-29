export type { McaLogContext, McaLogEnvelope, McaLogLevel } from "@/lib/logging/types";
export { mcaLog } from "@/lib/logging/mca-log-client";
/** Alias for `mcaLog` (Phase 46 structured envelope + `/api/log` in production). */
export { mcaLog as log } from "@/lib/logging/mca-log-client";
export type { McaLogApi } from "@/lib/logging/mca-log-factory";
