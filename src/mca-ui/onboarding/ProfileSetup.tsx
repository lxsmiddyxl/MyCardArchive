"use client";

import { extractApiErrorMessage } from "@/lib/client";
import { PROFILE_THEMES, type ProfileTheme } from "@/lib/binders/portfolio-types";
import { resolveAuthorName } from "@/lib/profile/resolveAuthor";
import { sanitizeDisplayName, sanitizeHandle, validateProfileInput } from "@/lib/validation/profile";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { cn } from "@/lib/ui/cn";
import Image from "next/image";
import { useMemo, useState } from "react";

export type ProfileSetupProps = {
  initialHandle?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  initialTheme?: ProfileTheme;
  initialBannerUrl?: string | null;
  onSaved?: () => void;
};

export function ProfileSetup({
  initialHandle,
  initialDisplayName,
  initialAvatarUrl,
  initialTheme = "color",
  initialBannerUrl,
  onSaved,
}: ProfileSetupProps) {
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl ?? "");
  const [theme, setTheme] = useState<ProfileTheme>(initialTheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewName = useMemo(
    () =>
      resolveAuthorName({
        display_name: sanitizeDisplayName(displayName) || null,
        handle: sanitizeHandle(handle) || null,
        username: null,
      }),
    [displayName, handle]
  );

  async function saveProfile() {
    setError(null);
    const disp = sanitizeDisplayName(displayName);
    const han = sanitizeHandle(handle);
    const validation = validateProfileInput({
      display_name: disp,
      handle: han,
    });
    if (!validation.valid) {
      setError(validation.errors[0] ?? "Check your profile fields.");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: disp,
        handle: han || undefined,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(extractApiErrorMessage(payload) ?? "Could not save profile.");
      return;
    }

    await fetch("/api/users/profile/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });

    if (bannerUrl.trim()) {
      await fetch("/api/users/profile/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner_url: bannerUrl.trim() }),
      });
    }

    setBusy(false);
    onSaved?.();
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && typeof payload.avatar_url === "string") {
      setAvatarUrl(payload.avatar_url);
    }
  }

  const initials = previewName.slice(0, 2).toUpperCase() || "MC";

  return (
    <Panel className="space-y-mca-lg">
      <div className="flex items-center gap-mca-md">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-mca-border-subtle bg-mca-chrome">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" sizes="64px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-mca-ink-muted">
              {initials}
            </span>
          )}
        </div>
        <label className="cursor-pointer text-sm font-medium text-mca-accent-strong/90 hover:underline">
          Upload avatar
          <input type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
        </label>
      </div>

      <Field label="Trainer name" id="setup-display-name">
        <input
          id="setup-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
          placeholder="Ash Ketchum"
        />
      </Field>

      <Field label="Username (handle)" id="setup-handle">
        <input
          id="setup-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
          placeholder="pokemonmaster"
        />
      </Field>

      <div>
        <p className="mb-mca-sm text-sm font-medium text-mca-ink-body">Profile theme</p>
        <div className="flex flex-wrap gap-mca-xs">
          {PROFILE_THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-mca-pill border px-mca-sm py-mca-tight text-xs font-medium capitalize transition duration-200 ease-mca-standard",
                theme === t
                  ? "border-mca-accent-border/50 bg-mca-accent-border/15 text-mca-accent"
                  : "border-mca-border-subtle text-mca-ink-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Field label="Banner image URL (optional)" id="setup-banner">
        <input
          id="setup-banner"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
          placeholder="https://…"
        />
      </Field>

      {error ? (
        <p className="text-sm text-mca-accent" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="button" variant="primary" disabled={busy} onClick={() => void saveProfile()}>
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </Panel>
  );
}
