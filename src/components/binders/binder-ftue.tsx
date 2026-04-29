"use client";

import { FtueOverlay } from "@/components/onboarding/ftue-overlay";

export function BinderFtue() {
  return (
    <FtueOverlay storageKey="mca:ftue:binder" surfaceName="binder-detail" title="Binder tips">
      <p>
        Drag cards between pages and use slots to mimic a physical binder. Open a card for details, decks, and grading
        when you need a closer look.
      </p>
    </FtueOverlay>
  );
}
