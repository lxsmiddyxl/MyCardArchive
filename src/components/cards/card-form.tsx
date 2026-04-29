"use client";

import { CardImageUpload } from "@/components/cards/card-image-upload";
import { Field } from "@/mca-ui/field";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingButton, LoadingSpinner } from "@/mca-ui/loading-button";
import { Panel } from "@/mca-ui/panel";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import pokemonData from "@/data/pokemon_sets.json";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "@/lib/perf/memo";
import { useEffect, useState } from "react";

const POKEMON_SETS = pokemonData.sets as readonly { id: string; name: string }[];
const CUSTOM_SET_VALUE = "__custom__";

export type CardFormInitialValues = {
  name?: string;
  number?: string;
  rarity?: string;
  set_name?: string | null;
  image_url?: string | null;
  catalog_card_id?: string | null;
};

type CardFormProps = {
  binderId: string;
  initialValues?: CardFormInitialValues | null;
  scanEventId?: string | null;
  cardLimitReached?: boolean;
};

type CatalogSearchHit = {
  id: string;
  name: string;
  set: string;
  number: string;
  rarity: string | null;
  image_url: string | null;
};

const RARITY_OPTIONS = [
  "Common",
  "Uncommon",
  "Rare",
  "Ultra Rare",
  "Secret Rare",
] as const;

const CATALOG_ROW_H = 62;
const CATALOG_VIEWPORT = 208;

function rarityForSelect(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  const hit = RARITY_OPTIONS.find((o) => o.toLowerCase() === t.toLowerCase());
  return hit ?? "";
}

const CatalogHitRow = memo(function CatalogHitRow({
  hit,
  onPick,
}: {
  hit: CatalogSearchHit;
  onPick: (h: CatalogSearchHit) => void;
}) {
  return (
    <li className="border-b border-mca-border/80 last:border-0" style={{ height: CATALOG_ROW_H }}>
      <button
        type="button"
        onClick={() => onPick(hit)}
        className="flex h-full w-full gap-mca-compact px-mca-compact py-mca-tight text-left transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated/80"
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface-elevated">
          {hit.image_url ? (
            <RemoteCardThumb
              src={hit.image_url}
              alt=""
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] text-mca-hint">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-mca-ink-strong">
            {hit.name} <span className="font-mono text-mca-ink-subtle">#{hit.number}</span>
          </p>
          <p className="truncate text-xs text-mca-ink-subtle">
            {hit.set}
            {hit.rarity ? ` · ${hit.rarity}` : ""}
          </p>
        </div>
      </button>
    </li>
  );
});

function CatalogHitsVirtualList({
  hits,
  onPick,
}: {
  hits: CatalogSearchHit[];
  onPick: (h: CatalogSearchHit) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = hits.length * CATALOG_ROW_H;
  const start = Math.max(0, Math.floor(scrollTop / CATALOG_ROW_H) - 2);
  const end = Math.min(
    hits.length,
    Math.ceil((scrollTop + CATALOG_VIEWPORT) / CATALOG_ROW_H) + 2
  );
  const slice = hits.slice(start, end);

  return (
    <div
      className="mt-mca-sm max-h-52 overflow-auto rounded-mca-card border border-mca-border bg-mca-surface/50"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: total }}>
        <ul
          className="absolute inset-x-0 top-0"
          style={{ transform: `translateY(${start * CATALOG_ROW_H}px)` }}
        >
          {slice.map((hit) => (
            <CatalogHitRow key={hit.id} hit={hit} onPick={onPick} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CardForm({
  binderId,
  initialValues,
  scanEventId = null,
  cardLimitReached = false,
}: CardFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [number, setNumber] = useState(initialValues?.number ?? "");
  const [setField, setSetField] = useState("");
  const [rarity, setRarity] = useState(initialValues?.rarity ?? "");
  const [imageUrl, setImageUrl] = useState(
    initialValues?.image_url != null ? String(initialValues.image_url) : ""
  );
  const [catalogCardId, setCatalogCardId] = useState<string | null>(
    initialValues?.catalog_card_id?.trim() || null
  );
  const [nameQuery, setNameQuery] = useState(initialValues?.name ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(initialValues?.name ?? "");
  const [catalogHits, setCatalogHits] = useState<CatalogSearchHit[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setMode, setSetMode] = useState<"preset" | "custom">("custom");
  const [presetId, setPresetId] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(nameQuery), 280);
    return () => window.clearTimeout(t);
  }, [nameQuery]);

  useEffect(() => {
    if (!initialValues) return;
    if (typeof initialValues.name === "string" && initialValues.name) {
      setName(initialValues.name);
      setNameQuery(initialValues.name);
    }
    if (typeof initialValues.number === "string") {
      setNumber(initialValues.number);
    }
    if (typeof initialValues.rarity === "string") {
      setRarity(rarityForSelect(initialValues.rarity));
    }
    if (initialValues.image_url != null && String(initialValues.image_url).length > 0) {
      setImageUrl(String(initialValues.image_url));
    }
    if (initialValues.catalog_card_id != null && initialValues.catalog_card_id.trim()) {
      setCatalogCardId(initialValues.catalog_card_id.trim());
    }
    const sn = initialValues.set_name?.trim();
    if (sn) {
      const match = POKEMON_SETS.find((s) => s.name === sn);
      if (match) {
        setSetMode("preset");
        setPresetId(match.id);
        setSetField(sn);
      } else {
        setSetMode("custom");
        setSetField(sn);
      }
    }
  }, [initialValues]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 1) {
      setCatalogHits([]);
      setCatalogErr(null);
      return;
    }

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogErr(null);

    (async () => {
      try {
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&limit=36`);
        const body = (await res.json().catch(() => ({}))) as {
          results?: CatalogSearchHit[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setCatalogHits([]);
          setCatalogErr(typeof body.error === "string" ? body.error : "Search failed");
          return;
        }
        setCatalogHits(Array.isArray(body.results) ? body.results : []);
      } catch {
        if (!cancelled) {
          setCatalogErr("Network error");
          setCatalogHits([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const applyCatalogHit = useCallback((hit: CatalogSearchHit) => {
    setName(hit.name);
    setNameQuery(hit.name);
    setNumber(hit.number ?? "");
    const setLabel = hit.set?.trim() ?? "";
    if (setLabel) {
      const match = POKEMON_SETS.find((s) => s.name === setLabel);
      if (match) {
        setSetMode("preset");
        setPresetId(match.id);
        setSetField(match.name);
      } else {
        setSetMode("custom");
        setSetField(setLabel);
      }
    }
    setRarity(rarityForSelect(hit.rarity));
    const img = hit.image_url?.trim() || "";
    setImageUrl(img);
    setCatalogCardId(hit.id);
    setDebouncedQuery("");
    setCatalogHits([]);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (cardLimitReached) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Card name is required.");
      return;
    }

    setLoading(true);
    const effectiveSetName =
      setMode === "preset"
        ? POKEMON_SETS.find((s) => s.id === presetId)?.name?.trim() ?? ""
        : setField.trim();

    const body: Record<string, unknown> = {
      binder_id: binderId,
      name: trimmedName,
      number: number.trim() || null,
      rarity: rarity.trim() || null,
      ...(effectiveSetName ? { set_name: effectiveSetName } : {}),
      image_url: frontFile ? null : imageUrl.trim() || null,
    };
    if (scanEventId && scanEventId.trim().length > 0) {
      body.scan_event_id = scanEventId.trim();
    }
    if (catalogCardId && catalogCardId.trim().length > 0) {
      body.catalog_card_id = catalogCardId.trim();
    }

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      card?: { id: string };
    };
    if (!res.ok) {
      setLoading(false);
      const msg =
        typeof payload.error === "string" ? payload.error : "Could not create card.";
      setError(msg);
      return;
    }

    const cardId = payload.card?.id;
    if (cardId && (frontFile || backFile)) {
      const fd = new FormData();
      if (frontFile) fd.append("front", frontFile);
      if (backFile) fd.append("back", backFile);
      const up = await fetch(`/api/cards/${encodeURIComponent(cardId)}/images`, {
        method: "POST",
        body: fd,
      });
      const upBody = (await up.json().catch(() => ({}))) as {
        error?: string;
        userMessage?: string;
      };
      if (!up.ok) {
        setLoading(false);
        const friendly =
          typeof upBody.userMessage === "string"
            ? upBody.userMessage
            : typeof upBody.error === "string"
              ? upBody.error
              : "Image upload failed.";
        setError(`${friendly} Your Pokémon card was saved; you can add photos later from card details.`);
        router.push(`/binders/${binderId}`);
        router.refresh();
        return;
      }
    }

    setLoading(false);
    router.push(`/binders/${binderId}`);
    router.refresh();
  }

  const inputClass =
    "mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-sm text-white placeholder:text-mca-ink-subtle disabled:opacity-60";

  return (
    <Panel elevated className="max-w-lg border-mca-border bg-mca-surface-elevated/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <form onSubmit={handleSubmit} className="space-y-mca-md">
      {scanEventId ? (
        <p className="rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/40 px-mca-base py-mca-compact text-xs leading-relaxed text-mca-ink-muted">
          This card is linked to a scan. Fields may be prefilled from catalog auto-match — edit freely
          before saving.
        </p>
      ) : null}

      {cardLimitReached ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/25 px-mca-base py-mca-compact text-sm text-mca-warning-tint">
          You&apos;ve reached your card limit.
          <Link
            href="/tier"
            className="ms-mca-xs font-semibold text-mca-accent underline-offset-2 hover:underline"
          >
            View plans and upgrade
          </Link>
          .
        </p>
      ) : null}

      <Field id="card-name" label="Card name">
        <input
          id="card-name"
          value={nameQuery}
          onChange={(e) => {
            setName(e.target.value);
            setNameQuery(e.target.value);
          }}
          required
          disabled={loading || cardLimitReached}
          className={cn(inputClass)}
          placeholder="e.g. Charizard"
        />
        {catalogCardId ? (
          <p className="mt-mca-xs text-xs text-mca-accent-strong/85">
            Linked catalog id:{" "}
            <span className="font-mono text-mca-ink-muted">{catalogCardId}</span>
            <button
              type="button"
              className="ms-mca-sm text-mca-ink-subtle underline-offset-2 hover:text-mca-ink-body hover:underline"
              onClick={() => setCatalogCardId(null)}
            >
              Clear link
            </button>
          </p>
        ) : null}
        {catalogErr ? (
          <InlineError className="mt-mca-sm text-xs">{catalogErr}</InlineError>
        ) : null}
        {catalogLoading ? (
          <div className="mt-mca-sm flex min-h-[2rem] items-center gap-mca-sm text-xs text-mca-ink-subtle">
            <LoadingSpinner className="size-4 text-mca-accent/90" />
            Searching catalog…
          </div>
        ) : null}
        {!catalogLoading &&
        debouncedQuery.trim().length >= 1 &&
        catalogHits.length === 0 &&
        !catalogErr ? (
          <p className="mt-mca-sm text-xs text-mca-ink-subtle">
            No results for &quot;{debouncedQuery.trim()}&quot;.
          </p>
        ) : null}
        {catalogHits.length > 0 ? (
          catalogHits.length > 10 ? (
            <CatalogHitsVirtualList hits={catalogHits} onPick={applyCatalogHit} />
          ) : (
            <ul className="mt-mca-sm max-h-52 overflow-auto rounded-mca-card border border-mca-border bg-mca-surface/50">
              {catalogHits.map((hit) => (
                <CatalogHitRow key={hit.id} hit={hit} onPick={applyCatalogHit} />
              ))}
            </ul>
          )
        ) : null}
      </Field>

      <div className="grid gap-mca-base sm:grid-cols-2">
        <Field id="card-number" label="Number">
          <input
            id="card-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            disabled={loading || cardLimitReached}
            className={cn(inputClass)}
          />
        </Field>
        <Field
          id="card-set-preset"
          label="Pokémon TCG set"
          hint="Pick a known expansion or choose Custom set for other games."
        >
          <select
            id="card-set-preset"
            value={setMode === "preset" ? presetId : CUSTOM_SET_VALUE}
            onChange={(e) => {
              const v = e.target.value;
              if (v === CUSTOM_SET_VALUE) {
                setSetMode("custom");
                return;
              }
              setSetMode("preset");
              setPresetId(v);
              const s = POKEMON_SETS.find((x) => x.id === v);
              if (s) setSetField(s.name);
            }}
            disabled={loading || cardLimitReached}
            className={cn(inputClass)}
          >
            <option value={CUSTOM_SET_VALUE}>Custom set (any TCG)</option>
            {POKEMON_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="card-rarity" label="Rarity" className="sm:col-span-2">
          <select
            id="card-rarity"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            disabled={loading || cardLimitReached}
            className={cn(inputClass)}
          >
            <option value="">Select rarity</option>
            {RARITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {setMode === "custom" ? (
        <Field
          id="card-set-custom"
          label="Custom set name"
          hint="Used when your card is not from the list above (e.g. Magic, sports)."
        >
          <input
            id="card-set-custom"
            value={setField}
            onChange={(e) => setSetField(e.target.value)}
            disabled={loading || cardLimitReached}
            className={cn(inputClass)}
            placeholder="e.g. Custom product line"
          />
        </Field>
      ) : null}

      <div className="grid gap-mca-lg sm:grid-cols-2">
        <CardImageUpload
          id="card-img-front"
          label="Front photo"
          hint="Optional — saved as full resolution + a 300px thumbnail for binders."
          file={frontFile}
          onFileChange={setFrontFile}
          disabled={loading || cardLimitReached}
        />
        <CardImageUpload
          id="card-img-back"
          label="Back photo"
          hint="Optional — back face for your binder detail view."
          file={backFile}
          onFileChange={setBackFile}
          disabled={loading || cardLimitReached}
        />
      </div>

      <Field
        id="card-image-url"
        label="Image URL (optional)"
        hint={
          frontFile
            ? "Cleared while a front photo is selected — upload runs after save."
            : "External artwork URL if you are not uploading a front photo."
        }
      >
        <input
          id="card-image-url"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={loading || cardLimitReached || Boolean(frontFile)}
          className={cn(inputClass)}
        />
      </Field>

      {error ? <InlineError className="text-sm">{error}</InlineError> : null}

      <div className="flex flex-wrap gap-mca-compact pt-mca-sm">
        <Link
          href={`/binders/${binderId}`}
          className={cn(
            "inline-flex flex-1 items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle sm:flex-none"
          )}
        >
          Cancel
        </Link>
        <LoadingButton
          type="submit"
          isLoading={loading}
          disabled={cardLimitReached}
          className="inline-flex flex-1 items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          Add card
        </LoadingButton>
      </div>
      </form>
    </Panel>
  );
}
