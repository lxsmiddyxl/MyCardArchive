import "server-only";

import { registerDiagnostic } from "@/lib/diagnostics/registry";
import {
  getDegradationMode,
  getLastLoadSnapshot,
  getLoadState,
  getLoadStateRingBuffer,
  refreshLoadState,
} from "@/lib/load/load-state";
import { getLoadSheddingFlags, runSheddingRules } from "@/lib/load/load-shedding";
import { getRecentSheddingEvents } from "@/lib/load/shedding-events";

async function loadStateCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const { level, snapshot } = await refreshLoadState();
  await runSheddingRules(level);
  const ok = level !== "critical";
  return {
    ok,
    data: {
      loadState: level,
      snapshot,
      degradationMode: getDegradationMode(),
      sheddingFlags: getLoadSheddingFlags(),
    },
  };
}

async function degradationModeCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const mode = getDegradationMode();
  const ok = mode !== "degrade:severe";
  return {
    ok,
    data: { degradationMode: mode },
  };
}

async function sheddingActivityCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const recent = [...getRecentSheddingEvents()].slice(-16);
  return {
    ok: true,
    data: {
      shedding: recent,
      ringPreview: getLoadStateRingBuffer().slice(-12),
      lastSnapshot: getLastLoadSnapshot(),
    },
  };
}

registerDiagnostic("loadStateCheck", loadStateCheck);
registerDiagnostic("degradationModeCheck", degradationModeCheck);
registerDiagnostic("sheddingActivityCheck", sheddingActivityCheck);
