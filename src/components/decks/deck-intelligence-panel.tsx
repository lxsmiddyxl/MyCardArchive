"use client";

import { computeDeckMlIntelligence } from "@/lib/decks/ml-intelligence";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Panel } from "@/mca-ui/panel";
import { memo, useEffect, useMemo, useRef } from "react";

export type DeckIntelligencePanelProps = {
  deckId: string;
  totalCards: number;
  typeDistribution: Record<string, number> | null | undefined;
  colorIdentity: string[];
  telemetryCtx: { componentName: string; surfaceName: string; traceId?: string };
};

export const DeckIntelligencePanel = memo(function DeckIntelligencePanel({
  deckId,
  totalCards,
  typeDistribution,
  colorIdentity,
  telemetryCtx,
}: DeckIntelligencePanelProps) {
  const intel = useMemo(
    () => computeDeckMlIntelligence({ totalCards, typeDistribution, colorIdentity }),
    [totalCards, typeDistribution, colorIdentity]
  );

  const lastTelemetryKey = useRef<string>("");
  useEffect(() => {
    const key = `${deckId}:${intel.synergyScore}:${intel.suggestedAdds.join(";")}:${intel.weaknessWarnings.join(";")}`;
    if (lastTelemetryKey.current === key) return;
    lastTelemetryKey.current = key;
    mcaLog.event(
      "deck.ml.suggestions",
      { deckId, count: intel.suggestedAdds.length },
      telemetryCtx
    );
    mcaLog.event("deck.ml.synergy", { deckId, score: intel.synergyScore }, telemetryCtx);
    mcaLog.event(
      "deck.ml.weakness",
      { deckId, count: intel.weaknessWarnings.length },
      telemetryCtx
    );
  }, [deckId, intel, telemetryCtx]);

  return (
    <Panel className="border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel lg:col-span-2 dark:border-mca-border-subtle">
      <h3 className="text-sm font-semibold text-mca-ink-strong">Deck intelligence (preview)</h3>
      <p className="mt-mca-xs text-xs text-mca-ink-subtle">
        Heuristic assists until a trained model is connected — same aggregates as your stats above.
      </p>
      <div className="mt-mca-base grid gap-mca-md sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">Synergy score</p>
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-nav-accent">
            {intel.synergyScore}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">Suggested adds</p>
          <ul className="mt-mca-xs list-inside list-disc space-y-mca-xs text-xs text-mca-ink-body">
            {intel.suggestedAdds.length ? (
              intel.suggestedAdds.map((s) => <li key={s}>{s}</li>)
            ) : (
              <li className="list-none text-mca-ink-subtle">No suggestions — tweak the list or add more cards.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-mca-md">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Weakness warnings
        </p>
        <ul className="mt-mca-xs space-y-mca-xs text-xs text-mca-ink-body">
          {intel.weaknessWarnings.length ? (
            intel.weaknessWarnings.map((w) => (
              <li
                key={w}
                className="rounded-mca-control border border-mca-warning-tint/35 bg-mca-warning-surface/15 px-mca-sm py-mca-xs"
              >
                {w}
              </li>
            ))
          ) : (
            <li className="text-mca-ink-subtle">No major warnings from this snapshot.</li>
          )}
        </ul>
      </div>
    </Panel>
  );
});
