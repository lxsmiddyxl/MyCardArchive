"use client";

import { formatBinderActivityLabel } from "@/lib/binders/binder-activity";
import { activityPayloadFromJson } from "@/lib/binders/binder-social-types";
import type { Json } from "@/lib/supabase/types";
import { FollowButton } from "@/mca-ui/profile/FollowButton";
import { FollowersList } from "@/mca-ui/profile/FollowersList";
import { FollowingList } from "@/mca-ui/profile/FollowingList";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";

export type UserProfilePageProps = {
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
  canFollow: boolean;
  publicBinders: Array<{
    id: string;
    name: string;
    description: string | null;
    share_url: string;
    updated_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    binder_id: string;
    type: string;
    payload: Json;
    created_at: string;
  }>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "MC").toUpperCase();
}

export function UserProfilePage({
  displayName,
  username,
  bio,
  avatarUrl,
  followerCount,
  followingCount,
  viewerFollowing,
  canFollow,
  publicBinders,
  recentActivity,
}: UserProfilePageProps) {
  const label = displayName?.trim() || (username ? `@${username}` : "Collector");

  return (
    <div className="space-y-mca-section">
      <header className="flex flex-col gap-mca-md border-b border-mca-border/80 pb-mca-lg sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-mca-border-subtle bg-mca-chrome/50 text-lg font-semibold text-mca-ink-body">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(label)
          )}
        </div>
        <div>
          <p className="mca-typo-label">Collector profile</p>
          <h1 className="text-3xl font-semibold tracking-tight text-mca-ink">{label}</h1>
          {username ? <p className="text-sm text-mca-ink-muted">@{username}</p> : null}
          {bio ? <p className="mt-mca-sm max-w-2xl text-sm text-mca-ink-muted">{bio}</p> : null}
          <p className="mt-mca-sm text-sm text-mca-ink-muted">
            <span className="font-medium text-mca-ink-body">{followerCount}</span> followers ·{" "}
            <span className="font-medium text-mca-ink-body">{followingCount}</span> following
          </p>
          {username && canFollow ? (
            <div className="mt-mca-sm">
              <FollowButton username={username} initialFollowing={viewerFollowing} />
            </div>
          ) : null}
        </div>
      </header>

      {username ? (
        <div className="grid gap-mca-lg md:grid-cols-2">
          <FollowersList username={username} />
          <FollowingList username={username} />
        </div>
      ) : null}

      <Panel className="space-y-mca-md">
        <h2 className="text-sm font-semibold text-mca-ink-body">Public binders</h2>
        <div className="grid gap-mca-md sm:grid-cols-2">
          {publicBinders.map((b) => (
            <Link
              key={b.id}
              href={b.share_url}
              className="rounded-mca-card border border-mca-border-subtle/80 p-mca-compact transition duration-200 ease-mca-standard hover:border-mca-accent-border/40"
            >
              <p className="font-medium text-mca-ink-body">{b.name}</p>
              {b.description ? (
                <p className="mt-mca-xs line-clamp-2 text-sm text-mca-ink-muted">{b.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
        {publicBinders.length === 0 ? (
          <p className="text-sm text-mca-ink-muted">No public binders yet.</p>
        ) : null}
      </Panel>

      <Panel className="space-y-mca-sm">
        <h2 className="text-sm font-semibold text-mca-ink-body">Recent activity</h2>
        <ul className="space-y-mca-sm">
          {recentActivity.map((a) => (
            <li key={a.id} className="text-sm text-mca-ink-muted">
              {formatBinderActivityLabel(
                a.type,
                activityPayloadFromJson(a.payload)
              )}{" "}
              <span className="text-mca-ink-subtle">
                · {new Date(a.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-mca-ink-muted">No recent binder activity.</p>
        ) : null}
      </Panel>
    </div>
  );
}
