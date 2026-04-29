import { ShowcaseClient } from "@/app/showcase/showcase-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Collection showcases",
};

export default async function ShowcaseIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/showcase");
  }

  return (
    <div className="space-y-mca-xl">
      <SurfaceMountTelemetry name="showcase-list" surfaceName="creator" />
      <header className="border-b border-mca-border pb-mca-lg">
        <p className="mca-typo-label">Creator</p>
        <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
          Collection showcases
        </h1>
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">
          Build curated pages that spotlight binders and featured cards from your collection.
        </p>
      </header>
      <ShowcaseClient />
    </div>
  );
}
