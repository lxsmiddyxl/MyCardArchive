import "server-only";

import "@/lib/failover/failover-actions";

export {
  FailoverRegistry,
  registerFailoverAction,
  runFailoverActions,
} from "@/lib/failover/failover-actions";
export type { FailoverActionFn } from "@/lib/failover/failover-actions";
export {
  checkRegionHealth,
  isSecondaryRegionConfigured,
  performFailback,
  performFailover,
  shouldFailback,
  shouldFailover,
  type CheckRegionHealthResult,
} from "@/lib/failover/failover-engine";
