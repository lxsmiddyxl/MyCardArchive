import "server-only";

import "@/lib/diagnostics/builtins";
import "@/lib/diagnostics/predictive-builtins";
import "@/lib/diagnostics/load-builtins";
import "@/lib/diagnostics/perf-builtins";
import "@/lib/diagnostics/stability-builtins";

export {
  DiagnosticsRegistry,
  registerDiagnostic,
  runDiagnostics,
} from "@/lib/diagnostics/registry";
export type { DiagnosticFn, DiagnosticResult } from "@/lib/diagnostics/types";
