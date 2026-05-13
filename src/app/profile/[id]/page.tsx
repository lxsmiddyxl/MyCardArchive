import { CollectorRoomSurface } from "@/components/collector-rooms/collector-room-surface";
import { CollectorRoomsPanel } from "@/components/collector-rooms/collector-rooms-panel";
import { PublicProfileClient } from "@/components/social/public-profile-client";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import {
  loadPublicSocialProfile,
  loadSelfSocialProfile,
  stubPublicProfile,
} from "@/lib/social/build-profile";
import type { SocialProfilePayload } from "@/lib/social/types";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: "Trainer profile" };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = params.id?.trim();
  if (!profileId) {
    redirect("/profile");
  }

  if (!user) {
    redirect(authSignInUrl(`/profile/${encodeURIComponent(profileId)}`));
  }

  let initial: SocialProfilePayload;
  if (profileId === user.id) {
    const loaded = await loadSelfSocialProfile(supabase, user);
    initial =
      "error" in loaded ? stubPublicProfile(profileId, `Could not load profile: ${loaded.error}`) : loaded;
  } else {
    initial = await loadPublicSocialProfile(supabase, profileId, user);
  }

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-xl">
        <SurfaceMountTelemetry name="public-profile-page" surfaceName="social.profile" />
        <header className="border-b border-mca-border pb-mca-lg">
          <p className="mca-typo-label">Social</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
            Trainer profile
          </h1>
          <Link
            href="/profile"
            className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            ← My profile
          </Link>
        </header>
        <CollectorRoomSurface roomType="profile_room" topicKey={profileId} />
        <CollectorRoomsPanel contextRoomType="profile_room" contextTopicKey={profileId} className="mt-mca-md" />
        <PublicProfileClient initial={initial} viewerId={user.id} />
      </div>
    </AuthenticatedPresenceShell>
  );
}
