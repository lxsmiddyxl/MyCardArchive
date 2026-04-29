import { assignExperimentVariant } from "@/lib/experiments/assign";
import { getKnownPublicFeatureFlags } from "@/lib/feature-flags/public";
import { isServerFeatureEnabled } from "@/lib/feature-flags/server";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/dev/experiments", surfaceName: "experiments" } as const;

const KNOWN_EXPERIMENTS = [
  { key: "binder_ui_density", variants: ["comfortable", "compact"] as const },
  { key: "trade_sheet_layout", variants: ["v1", "v2"] as const },
] as const;

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments: Record<string, string> = {};
  for (const exp of KNOWN_EXPERIMENTS) {
    assignments[exp.key] = assignExperimentVariant(user.id, exp.key, exp.variants);
  }

  mcaLog.event("experiment.assign", { userId: user.id, assignments }, CTX);
  mcaLog.event("experiment.variant_exposure", { userId: user.id, assignments, surface: "dev_snapshot" }, CTX);

  const pub = getKnownPublicFeatureFlags();

  return NextResponse.json({
    userId: user.id,
    assignments,
    flags: {
      ...pub,
      serverBillingProbe: isServerFeatureEnabled("BILLING_PROBE"),
    },
  });
}

export const GET = defineRouteNoArgs("GET /api/dev/experiments/snapshot", GET_handler);
