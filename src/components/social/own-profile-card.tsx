"use client";

import { TierBadgeInline } from "@/components/tier/tier-badge-inline";
import type { SocialProfilePayload } from "@/lib/social/types";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

export type OwnProfileCardProps = {
  profile: SocialProfilePayload;
  publicProfileHref: string;
};

export const OwnProfileCard = memo(function OwnProfileCard({ profile, publicProfileHref }: OwnProfileCardProps) {
  const [bio, setBio] = useState(() => profile.bio ?? "");
  const [favoriteSets, setFavoriteSets] = useState(() => profile.favoriteSets ?? []);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBio(profile.bio ?? "");
    setFavoriteSets(profile.favoriteSets ?? []);
  }, [profile.bio, profile.favoriteSets]);

  useEffect(() => {
    mcaLog.event(
      "social.profile.view",
      { userId: profile.userId, visibility: profile.visibility },
      { componentName: "OwnProfileCard", surfaceName: "social.profile" }
    );
  }, [profile.userId, profile.visibility]);

  const stats = profile.stats;
  const statLine = useMemo(
    () =>
      `${stats.cardCount} cards · ${stats.binderCount} binders · ${stats.deckCount} decks · ${stats.tradeCount} trades`,
    [stats]
  );

  const onSaveExtras = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/social/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, favoriteSets }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(j.error ?? "Could not save");
        return;
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [bio, favoriteSets]);

  const showSocialCounts =
    typeof profile.followerCount === "number" && typeof profile.followingCount === "number";

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md transition-all duration-200 ease-mca-standard">
      <div className="flex flex-col gap-mca-md sm:flex-row sm:items-start">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-surface">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized={profile.avatarUrl.startsWith("data:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-mca-caption text-mca-ink-subtle">
              No avatar
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-mca-sm">
          <div>
            <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Your profile
            </p>
            <p className="mt-mca-xs flex flex-wrap items-center gap-mca-xs text-mca-h3 text-mca-ink-strong">
              <TierBadgeInline tierSlug={profile.tierSlug} />
              <span>{profile.username?.trim() || "Collector"}</span>
            </p>
            {profile.email ? (
              <p className="text-mca-caption text-mca-ink-muted">{profile.email}</p>
            ) : null}
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{statLine}</p>
            {showSocialCounts ? (
              <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
                {profile.followerCount} followers · {profile.followingCount} following
              </p>
            ) : null}
          </div>
          <p className="text-mca-caption text-mca-hint">
            Bio and favorite sets are saved to your account and shown on your public trainer profile.
          </p>
          <Field id="profile-bio" label="Bio">
            <textarea
              id="profile-bio"
              rows={3}
              className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body text-mca-ink-body outline-none transition-colors duration-200 ease-mca-standard focus-visible:ring-2 focus-visible:ring-mca-focus/60"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other collectors what you collect…"
            />
          </Field>
          <Field
            id="profile-favorites"
            label="Favorite sets"
            hint="One per line or comma-separated — matches how you think about your collection."
          >
            <textarea
              id="profile-favorites"
              rows={2}
              className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body text-mca-ink-body outline-none transition-colors duration-200 ease-mca-standard focus-visible:ring-2 focus-visible:ring-mca-focus/60"
              value={favoriteSets.join(", ")}
              onChange={(e) =>
                setFavoriteSets(
                  e.target.value
                    .split(/[,\n]+/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Scarlet & Violet — Journey Together, …"
            />
          </Field>
          {saveError ? <p className="text-mca-caption text-red-500/90">{saveError}</p> : null}
          <div className="flex flex-wrap items-center gap-mca-sm">
            <Button
              type="button"
              variant="secondary"
              className="text-mca-caption"
              disabled={saving}
              onClick={() => void onSaveExtras()}
            >
              Save bio & favorites
            </Button>
            {savedFlash ? (
              <span className="text-mca-caption text-mca-nav-accent">Saved.</span>
            ) : null}
            <Link
              href={publicProfileHref}
              className="text-mca-caption font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
            >
              Preview public URL →
            </Link>
          </div>
        </div>
      </div>
    </Panel>
  );
});
