import "server-only";

import "@/lib/recovery/recovery-actions";

export {
  isAutoRecoveryEnabled,
  RecoveryRegistry,
  registerRecoveryAction,
  runRecovery,
} from "@/lib/recovery/recovery-engine";
export type { RecoveryResult } from "@/lib/recovery/recovery-engine";
