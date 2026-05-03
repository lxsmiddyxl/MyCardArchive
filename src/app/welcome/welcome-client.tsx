"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STORAGE_DONE = "mca:welcome:v1";

function readDone(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_DONE) === "1";
  } catch {
    return false;
  }
}

function writeDone(): void {
  try {
    window.localStorage.setItem(STORAGE_DONE, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Launch onboarding checklist — optional steps, skip-safe, idempotent (re-visiting works).
 * No user identifiers in telemetry payloads.
 */
export function WelcomeLaunchClient() {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(readDone());
    mcaLog.event("launch.welcome.view", {}, { componentName: "WelcomeLaunchClient", surfaceName: "onboarding" });
  }, []);

  const finishToFeed = useCallback(() => {
    writeDone();
    mcaLog.event("launch.welcome.finish", { path: "feed" }, { componentName: "WelcomeLaunchClient", surfaceName: "onboarding" });
    router.push("/feed");
  }, [router]);

  const skipToFeed = useCallback(() => {
    writeDone();
    mcaLog.event("launch.welcome.skip", {}, { componentName: "WelcomeLaunchClient", surfaceName: "onboarding" });
    router.push("/feed");
  }, [router]);

  return (
    <div className="space-y-mca-xl">
      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">Welcome</p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong">Getting started</h1>
        <p className="text-mca-body text-mca-ink-muted">
          Complete these steps when you are ready, or skip and explore the app. You can return here anytime from the
          footer.
        </p>
      </header>

      {completed ? (
        <Panel elevated className="border border-mca-border-subtle p-mca-lg">
          <p className="text-sm text-mca-ink-body">
            You have already finished this checklist on this device. Jump back to the feed or revisit any step below.
          </p>
          <div className="mt-mca-lg flex flex-wrap gap-mca-compact">
            <Button type="button" variant="primary" onClick={() => router.push("/feed")}>
              Go to feed
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCompleted(false)}>
              Show steps again
            </Button>
          </div>
        </Panel>
      ) : null}

      <ol className="space-y-mca-md">
        <li>
          <Panel className="border border-mca-border-subtle p-mca-lg">
            <p className="text-mca-label font-semibold text-mca-ink-strong">1. Trainer name & avatar</p>
            <p className="mt-mca-sm text-sm text-mca-ink-muted">
              Set your display name, handle, and trainer portrait so other collectors recognize you.
            </p>
            <div className="mt-mca-md">
              <Link
                href="/profile/edit"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
              >
                Edit profile
              </Link>
            </div>
          </Panel>
        </li>
        <li>
          <Panel className="border border-mca-border-subtle p-mca-lg">
            <p className="text-mca-label font-semibold text-mca-ink-strong">2. Create a binder (optional)</p>
            <p className="mt-mca-sm text-sm text-mca-ink-muted">
              Organize your Pokémon TCG cards in a digital binder. Skip if you prefer to browse first.
            </p>
            <div className="mt-mca-md flex flex-wrap gap-mca-compact">
              <Link
                href="/binders/create"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
              >
                Create binder
              </Link>
              <Link
                href="/binders"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control px-mca-compact py-mca-sm text-sm font-semibold text-mca-accent-strong/90 underline-offset-2 transition-colors duration-200 ease-mca-standard hover:underline"
              >
                View binders
              </Link>
            </div>
          </Panel>
        </li>
        <li>
          <Panel className="border border-mca-border-subtle p-mca-lg">
            <p className="text-mca-label font-semibold text-mca-ink-strong">3. Follow trainers (optional)</p>
            <p className="mt-mca-sm text-sm text-mca-ink-muted">
              Open your feed to see recommended collectors and follow trainers you know.
            </p>
            <div className="mt-mca-md">
              <Link
                href="/feed"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
              >
                Open feed & recommendations
              </Link>
            </div>
          </Panel>
        </li>
      </ol>

      <Panel elevated className="border border-mca-border-subtle p-mca-lg">
        <p className="text-sm text-mca-ink-muted">
          Policies:{" "}
          <Link href="/legal/terms" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Terms
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/support" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Support
          </Link>
        </p>
        <div className="mt-mca-lg flex flex-wrap gap-mca-compact">
          <Button type="button" variant="primary" onClick={finishToFeed}>
            Done — go to feed
          </Button>
          <Button type="button" variant="secondary" onClick={skipToFeed}>
            Skip for now
          </Button>
        </div>
      </Panel>
    </div>
  );
}
