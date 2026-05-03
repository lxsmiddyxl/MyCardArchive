import { ModelScanClient } from "@/components/scan/model-scan-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Model scan v2.5 · Scan",
};

export default function ModelScanPage() {
  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="scan-model-v2-page" surfaceName="scan" />
      <ModelScanClient />
    </div>
  );
}
