"use client";

import { resolveAuthorName } from "@/lib/profile/resolveAuthor";
import { safeTrainerAccent } from "@/lib/profile/trainer-accent";
import type { SocialProfilePayload } from "@/lib/social/types";
import {
  PROFILE_LIMITS,
  sanitizeDisplayName,
  sanitizeHandle,
  validateProfileInput,
} from "@/lib/validation/profile";
import { ColorSwatchPicker } from "@/components/profile/color-swatch-picker";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = { initial: SocialProfilePayload };

export function ProfileEditClient({ initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(() => initial.displayName ?? "");
  const [handle, setHandle] = useState(() => initial.handle ?? "");
  const [bio, setBio] = useState(() => (initial.bio ?? "").slice(0, PROFILE_LIMITS.bioMax));
  const [location, setLocation] = useState(() => initial.location ?? "");
  const [website, setWebsite] = useState(() => initial.website ?? "");
  const [favoriteCard, setFavoriteCard] = useState(() => initial.favoriteCard ?? "");
  const [favoriteSet, setFavoriteSet] = useState(() => initial.favoriteSet ?? "");
  const [favoriteColor, setFavoriteColor] = useState(() => initial.favoriteColor ?? "");
  const [avatarUrl, setAvatarUrl] = useState(() => initial.avatarUrl ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [adjustedInfo, setAdjustedInfo] = useState<string | null>(null);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const previewAccent = useMemo(() => safeTrainerAccent(favoriteColor), [favoriteColor]);

  useEffect(() => {
    setDisplayName(initial.displayName ?? "");
    setHandle(initial.handle ?? "");
    setBio((initial.bio ?? "").slice(0, PROFILE_LIMITS.bioMax));
    setLocation(initial.location ?? "");
    setWebsite(initial.website ?? "");
    setFavoriteCard(initial.favoriteCard ?? "");
    setFavoriteSet(initial.favoriteSet ?? "");
    setFavoriteColor(initial.favoriteColor ?? "");
    setAvatarUrl(initial.avatarUrl ?? "");
  }, [
    initial.displayName,
    initial.handle,
    initial.bio,
    initial.location,
    initial.website,
    initial.favoriteCard,
    initial.favoriteSet,
    initial.favoriteColor,
    initial.avatarUrl,
  ]);

  const sanitizedHandle = useMemo(() => sanitizeHandle(handle), [handle]);

  useEffect(() => {
    if (!sanitizedHandle || sanitizedHandle.length < PROFILE_LIMITS.handleMin) {
      setHandleAvailable(null);
      return;
    }
    const t = window.setTimeout(async () => {
      const q = new URLSearchParams({
        handle: sanitizedHandle,
        exclude_user_id: initial.userId,
      });
      const res = await fetch(`/api/profile/handle-available?${q.toString()}`, { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { available?: boolean };
      if (res.ok && typeof j.available === "boolean") {
        setHandleAvailable(j.available);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [sanitizedHandle, initial.userId]);

  const previewName = resolveAuthorName({
    display_name: sanitizeDisplayName(displayName) || null,
    handle: sanitizedHandle || null,
    username: initial.username ?? null,
  });

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setErrors([]);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { avatar_url?: string; error?: string };
      if (!res.ok) {
        setErrors([j.error ?? "Avatar upload failed."]);
        return;
      }
      if (j.avatar_url) setAvatarUrl(j.avatar_url);
      router.refresh();
    } finally {
      setAvatarBusy(false);
      e.target.value = "";
    }
  }

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors([]);
      setSuccess(false);
      setAdjustedInfo(null);
      const disp = sanitizeDisplayName(displayName);
      const han = sanitizeHandle(handle);
      const v = validateProfileInput({
        display_name: disp,
        handle: han || undefined,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        favorite_card: favoriteCard.trim(),
        favorite_set: favoriteSet.trim(),
        favorite_color: favoriteColor.trim(),
      });
      if (!v.valid) {
        setErrors(v.errors);
        return;
      }
      if (han && handleAvailable === false) {
        setErrors(["That handle is already taken. Pick another."]);
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: disp,
            handle: han,
            bio: bio.trim(),
            location: location.trim(),
            website: website.trim(),
            favorite_card: favoriteCard.trim(),
            favorite_set: favoriteSet.trim(),
            favorite_color: favoriteColor.trim(),
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          errors?: string[];
          adjusted?: boolean;
        };
        if (!res.ok) {
          setErrors([j.error ?? "Could not save profile.", ...(j.errors ?? [])].filter(Boolean) as string[]);
          return;
        }
        setSuccess(true);
        if (j.adjusted) {
          setAdjustedInfo(
            "Some fields were adjusted to meet community standards (e.g. censored words or a generated trainer name)."
          );
        }
        router.refresh();
      } finally {
        setSaving(false);
      }
    },
    [
      bio,
      displayName,
      favoriteCard,
      favoriteColor,
      favoriteSet,
      handle,
      handleAvailable,
      location,
      router,
      website,
    ]
  );

  const labelId = "profile-edit-heading";

  return (
    <div className="grid gap-mca-xl lg:grid-cols-[1fr,min(360px,100%)]">
      <Panel
        className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-lg shadow-mca-card"
        aria-labelledby={labelId}
      >
        <h1 id={labelId} className="text-2xl font-bold text-mca-ink-strong">
          Edit your trainer profile
        </h1>
        <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
          Have fun showing your personality — names are filtered for a safe, friendly space.
        </p>

        <div className="mt-mca-md border-b border-dashed border-mca-border pb-mca-lg">
          <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">Avatar</p>
          <div className="mt-mca-sm flex flex-wrap items-center gap-mca-md">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-mca-border shadow-mca-panel"
              style={{ boxShadow: `0 0 24px color-mix(in srgb, ${previewAccent} 40%, transparent)` }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={avatarUrl.startsWith("data:")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-mca-chrome/30 text-mca-ink-muted">
                  —
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-mca-control border border-mca-border bg-mca-surface px-mca-md py-mca-sm text-mca-caption font-medium hover:bg-mca-chrome/30">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="sr-only"
                disabled={avatarBusy || saving}
                onChange={(e) => void onAvatarChange(e)}
              />
              {avatarBusy ? "Uploading…" : "Upload photo"}
            </label>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-mca-md space-y-mca-base" noValidate>
          <Field id="mca-edit-display" label="Display name">
            <input
              id="mca-edit-display"
              name="display_name"
              className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={PROFILE_LIMITS.displayMin}
              maxLength={PROFILE_LIMITS.displayMax}
              required
              disabled={saving}
            />
          </Field>

          <Field id="mca-edit-handle" label="Handle">
            <div className="flex flex-wrap items-center gap-mca-sm">
              <span className="text-mca-caption text-mca-ink-muted">@</span>
              <input
                id="mca-edit-handle"
                name="handle"
                className="min-w-[12rem] flex-1 rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs font-mono text-mca-body"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                maxLength={PROFILE_LIMITS.handleMax}
                disabled={saving}
              />
              {sanitizedHandle.length >= PROFILE_LIMITS.handleMin ? (
                <span
                  className={`text-mca-caption ${handleAvailable === false ? "text-mca-error-accent" : handleAvailable === true ? "text-mca-success-bold dark:text-mca-success" : "text-mca-ink-muted"}`}
                  role="status"
                >
                  {handleAvailable === false
                    ? "Taken"
                    : handleAvailable === true
                      ? "Available"
                      : "…"}
                </span>
              ) : null}
            </div>
          </Field>

          <Field id="mca-edit-bio" label="Bio">
            <textarea
              id="mca-edit-bio"
              name="bio"
              className="min-h-[5rem] w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, PROFILE_LIMITS.bioMax))}
              maxLength={PROFILE_LIMITS.bioMax}
              disabled={saving}
            />
          </Field>

          <Field id="mca-edit-location" label="Location">
            <input
              id="mca-edit-location"
              name="location"
              className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, PROFILE_LIMITS.locationMax))}
              maxLength={PROFILE_LIMITS.locationMax}
              disabled={saving}
            />
          </Field>

          <Field id="mca-edit-website" label="Website">
            <input
              id="mca-edit-website"
              name="website"
              type="url"
              className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={website}
              onChange={(e) => setWebsite(e.target.value.slice(0, PROFILE_LIMITS.websiteMax))}
              maxLength={PROFILE_LIMITS.websiteMax}
              placeholder="https://"
              disabled={saving}
            />
          </Field>

          <Field id="mca-edit-fav-card" label="Favorite card">
            <input
              id="mca-edit-fav-card"
              name="favorite_card"
              className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={favoriteCard}
              onChange={(e) => setFavoriteCard(e.target.value.slice(0, PROFILE_LIMITS.favoriteMax))}
              maxLength={PROFILE_LIMITS.favoriteMax}
              disabled={saving}
              placeholder="e.g. Charizard ex"
            />
          </Field>

          <Field id="mca-edit-fav-set" label="Favorite set">
            <input
              id="mca-edit-fav-set"
              name="favorite_set"
              className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={favoriteSet}
              onChange={(e) => setFavoriteSet(e.target.value.slice(0, PROFILE_LIMITS.favoriteMax))}
              maxLength={PROFILE_LIMITS.favoriteMax}
              disabled={saving}
              placeholder="e.g. Obsidian Flames"
            />
          </Field>

          <div className="space-y-mca-micro">
            <p
              id="mca-edit-fav-color-label"
              className="block text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle"
            >
              Favorite color (accent)
            </p>
            <p id="mca-edit-fav-color-hint" className="text-xs text-mca-hint">
              Tap a swatch for your trainer accent — used on your card preview and avatar ring.
            </p>
            <ColorSwatchPicker
              aria-labelledby="mca-edit-fav-color-label"
              aria-describedby="mca-edit-fav-color-hint"
              value={favoriteColor}
              onChange={(hex) => setFavoriteColor(hex.slice(0, PROFILE_LIMITS.colorMax))}
              disabled={saving}
            />
          </div>

          {errors.length > 0 ? (
            <ul
              className="rounded-mca-control border border-mca-border bg-mca-surface/60 p-mca-sm text-mca-caption text-mca-error-accent"
              role="alert"
            >
              {errors.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}

          {success && errors.length === 0 ? (
            <div className="space-y-mca-sm" role="status">
              <p className="text-mca-caption text-mca-success-bold dark:text-mca-success">Profile saved.</p>
              {adjustedInfo ? <p className="text-mca-caption text-mca-ink-subtle">{adjustedInfo}</p> : null}
            </div>
          ) : null}

          <Button type="submit" disabled={saving} variant="primary" className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Panel>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Panel
          className="rounded-mca-card border border-mca-border/80 p-mca-lg shadow-mca-card"
          style={
            {
              "--trainer-accent": previewAccent,
              boxShadow: `0 16px 40px color-mix(in srgb, ${previewAccent} 18%, transparent)`,
            } as React.CSSProperties
          }
        >
          <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-muted">Live preview</p>
          <div className="mt-mca-md flex flex-col items-center text-center">
            <div
              className="relative mb-mca-md h-28 w-28 overflow-hidden rounded-full border-4 shadow-[0_0_28px_var(--trainer-accent)]"
              style={{
                borderColor: `color-mix(in srgb, ${previewAccent} 55%, transparent)`,
              }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={avatarUrl.startsWith("data:")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-mca-chrome/25 text-xl text-mca-ink-muted">
                  ?
                </div>
              )}
            </div>
            <p className="text-lg font-bold text-mca-ink-strong">{previewName}</p>
            {sanitizedHandle ? (
              <p className="mt-mca-trace font-mono text-sm text-mca-ink-muted">@{sanitizedHandle}</p>
            ) : null}
            {favoriteCard.trim() ? (
              <p className="mt-mca-sm text-mca-caption text-mca-ink-body">Loves {favoriteCard.trim()}</p>
            ) : null}
            {favoriteSet.trim() ? (
              <p className="text-mca-caption text-mca-ink-muted">Set: {favoriteSet.trim()}</p>
            ) : null}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
