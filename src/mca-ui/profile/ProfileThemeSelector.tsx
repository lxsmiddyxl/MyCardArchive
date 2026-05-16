"use client";

import { PROFILE_THEMES, type ProfileTheme } from "@/lib/binders/portfolio-types";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useState } from "react";

export type ProfileThemeSelectorProps = {
  initialTheme: ProfileTheme;
};

export function ProfileThemeSelector({ initialTheme }: ProfileThemeSelectorProps) {
  const [theme, setTheme] = useState<ProfileTheme>(initialTheme);
  const [busy, setBusy] = useState(false);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Profile theme</h2>
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
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void fetch("/api/users/profile/theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme }),
          }).finally(() => setBusy(false));
        }}
      >
        Save theme
      </Button>
    </Panel>
  );
}
