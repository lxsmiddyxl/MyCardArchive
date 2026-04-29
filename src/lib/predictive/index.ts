import "server-only";

export {
  getPredictiveConfidenceThreshold,
  highestSeverityFromPredictions,
  isPredictiveModeEnabled,
  predictorRecoveryActionName,
  PredictiveRegistry,
  registerPredictor,
  resetPredictiveCacheForTests,
  runPredictors,
  type PredictionResult,
  type PredictionSeverity,
  type PredictorFn,
} from "@/lib/predictive/predictive-engine";
