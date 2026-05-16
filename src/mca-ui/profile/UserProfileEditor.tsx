"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { PROFILE_LIMITS, validateProfileInput } from "@/lib/validation/profile";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useState } from "react";

export type UserProfileEditorProps = {
  initialDisplayName: string;
  initialHandle: string;
  initialBio: string;
};

export function UserProfileEditor({
  initialDisplayName,
  initialHandle,
  initialBio,
}: UserProfileEditorProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [handle, setHandle] = useState(initialHandle);
  const [bio, setBio] = useState(initialBio.slice(0, PROFILE_LIMITS.bioMax));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const save = useCallback(async () => {
    const validation = validateProfileInput({
      display_name: displayName,
      handle,
      bio,
    });
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/users/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, handle, bio }),
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not save profile");
        return;
      }
      setOk(true);
    } finally {
      setBusy(false);
    }
  }, [bio, displayName, handle]);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Profile</h2>
      <Field id="profile-display" label="Display name">
        <input
          id="profile-display"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Field id="profile-handle" label="Username">
        <input
          id="profile-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Field id="profile-bio" label="Bio">
        <textarea
          id="profile-bio"
          value={bio}
          rows={4}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      {error ? <p className="text-sm text-mca-error-text">{error}</p> : null}
      {ok ? <p className="text-sm text-mca-success-text">Profile saved.</p> : null}
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void save()}>
        Save profile
      </Button>
    </Panel>
  );
}
