"use client";

import type { CardRow } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialCards: CardRow[];
};

export function CardGrid({ initialCards }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeCard(id: string) {
    setRemoving(id);
    const res = await fetch(`/api/cards/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setRemoving(null);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      alert(j.error ?? "Could not remove card.");
      return;
    }
    router.refresh();
  }

  if (initialCards.length === 0) {
    return (
      <p className="rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 p-mca-section text-center text-sm text-mca-ink-subtle">
        No cards yet. Use &quot;Add card&quot; to create an entry.
      </p>
    );
  }

  return (
    <ul className="grid gap-mca-base sm:grid-cols-2 lg:grid-cols-3">
      {initialCards.map((card) => (
        <li
          key={card.id}
          className="overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40"
        >
          <div className="aspect-[3/4] bg-mca-surface-elevated">
            {card.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-mca-ink-subtle">
                No image
              </div>
            )}
          </div>
          <div className="p-mca-base">
            <h3 className="font-medium text-mca-ink-strong">{card.name}</h3>
            <dl className="mt-mca-sm space-y-mca-xs text-xs text-mca-ink-muted">
              <div>
                <dt className="inline text-mca-ink-subtle">#: </dt>
                <dd className="inline">{card.number ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline text-mca-ink-subtle">Rarity: </dt>
                <dd className="inline">{card.rarity ?? "—"}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={removing === card.id}
              onClick={() => removeCard(card.id)}
              className="mt-mca-compact text-xs font-medium text-red-400 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {removing === card.id ? "Removing…" : "Remove"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
