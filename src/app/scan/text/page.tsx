import { TextScanClient } from "@/components/scan/text-scan-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Text scan · Scan",
};

export default function TextScanPage() {
  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="scan-text-page" surfaceName="scan" />
      <TextScanClient />
    </div>
  );
}
