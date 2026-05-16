"use client";

import { CardImageUpload } from "@/components/cards/card-image-upload";
import { requestBinderSurfacesRefresh } from "@/lib/binders/binder-surfaces-refresh";
import {
  catalogDetailToSelection,
  catalogHitToSelection,
  isCatalogFormLocked,
  type CatalogCardDetailRow,
  type CatalogFormSelection,
} from "@/lib/catalog/catalog-form-hydration";
import {
  buildCatalogSearchUrlForMode,
  CATALOG_AUTOCOMPLETE_DEBOUNCE_MS,
  CATALOG_AUTOCOMPLETE_LIMIT,
  CATALOG_SET_SEARCH_LIMIT,
  parseCatalogSearchResults,
} from "@/lib/catalog/search";
import {
  buildSuggestionGroups,
  shouldLoadSuggestions,
} from "@/lib/catalog/suggestions";
import {
  classifyCatalogQuery,
  isAutoDetectNumberQuery,
  type CatalogSearchMode,
} from "@/lib/catalog/search-modes";
import type { AddCardPrefillPayload, CatalogCardHit, CatalogSetHit } from "@/lib/dto/catalog";
import type { BinderAddMutationResponseDTO } from "@/lib/dto/scan-add";
import { fetchJson, fetchJsonErrorMessage, fetchJsonUserFacingMessage } from "@/lib/client";
import { Field } from "@/mca-ui/field";
import { CatalogCardPreview } from "@/mca-ui/catalog-card-preview";
import { CatalogCombobox } from "@/mca-ui/catalog-combobox";
import { CatalogSuggestionsStrip } from "@/mca-ui/catalog-suggestions-strip";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingButton } from "@/mca-ui/loading-button";
import { Panel } from "@/mca-ui/panel";
import pokemonData from "@/data/pokemon_sets.json";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "@/lib/perf/memo";
import { useEffect, useState } from "react";

const POKEMON_SETS = pokemonData.sets as readonly { id: string; name: string }[];
const CUSTOM_SET_VALUE = "__custom__";

export type CardFormInitialValues = AddCardPrefillPayload;

type CardFormProps = {
  binderId: string;
  initialValues?: CardFormInitialValues | null;
  scanEventId?: string | null;
  cardLimitReached?: boolean;
};

type CatalogSetScopeRow = CatalogSetHit;

const RARITY_OPTIONS = [
  "Common",
  "Uncommon",
  "Rare",
  "Ultra Rare",
  "Secret Rare",
] as const;

function rarityForSelect(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  const hit = RARITY_OPTIONS.find((o) => o.toLowerCase() === t.toLowerCase());
  return hit ?? "";
}

function applySelectionToForm(
  sel: CatalogFormSelection,
  setters: {
    setName: (v: string) => void;
    setNameQuery: (v: string) => void;
    setNumber: (v: string) => void;
    setRarity: (v: string) => void;
    setImageUrl: (v: string) => void;
    setCatalogCardId: (v: string | null) => void;
    setSetMode: (v: "preset" | "custom") => void;
    setPresetId: (v: string) => void;
    setSetField: (v: string) => void;
    setSupertype: (v: string) => void;
    setSubtypes: (v: string) => void;
    setType: (v: string) => void;
    setTcgplayerId: (v: string) => void;
    setCatalogSelection: (v: CatalogFormSelection | null) => void;
  }
) {
  setters.setName(sel.name);
  setters.setNameQuery(sel.name);
  setters.setNumber(sel.number);
  setters.setRarity(rarityForSelect(sel.rarity));
  setters.setImageUrl(sel.imageUrl);
  setters.setCatalogCardId(sel.catalogCardId);
  setters.setSupertype(sel.supertype);
  setters.setSubtypes(sel.subtypes.join(", "));
  setters.setType(sel.type);
  setters.setTcgplayerId(sel.tcgplayerId);

  const match = POKEMON_SETS.find((s) => s.id === sel.setId || s.name === sel.setName);
  if (match) {
    setters.setSetMode("preset");
    setters.setPresetId(match.id);
    setters.setSetField(match.name);
  } else if (sel.setName) {
    setters.setSetMode("custom");
    setters.setSetField(sel.setName);
  }

  setters.setCatalogSelection(sel);
}

export const CardForm = memo(function CardForm({
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
  const [supertype, setSupertype] = useState(initialValues?.supertype ?? "");
  const [subtypes, setSubtypes] = useState(
    Array.isArray(initialValues?.subtypes) ? initialValues!.subtypes!.join(", ") : ""
  );
  const [type, setType] = useState(initialValues?.supertype ?? "");
  const [tcgplayerId, setTcgplayerId] = useState(initialValues?.catalog_card_id ?? "");

  const [nameQuery, setNameQuery] = useState(initialValues?.name ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(initialValues?.name ?? "");
  const [catalogHits, setCatalogHits] = useState<CatalogCardHit[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [activeHitIndex, setActiveHitIndex] = useState(-1);
  const [catalogSelection, setCatalogSelection] = useState<CatalogFormSelection | null>(null);
  const [manualEdit, setManualEdit] = useState(false);
  const [searchMode, setSearchMode] = useState<CatalogSearchMode>("name");
  const [autoDetectedFromNumber, setAutoDetectedFromNumber] = useState(false);
  const [suggestionGroups, setSuggestionGroups] = useState<
    ReturnType<typeof buildSuggestionGroups>
  >([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [catalogSetsForScope, setCatalogSetsForScope] = useState<CatalogSetScopeRow[]>([]);
  const [catalogSearchSetId, setCatalogSearchSetId] = useState(
    initialValues?.set_id?.trim() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setMode, setSetMode] = useState<"preset" | "custom">("custom");
  const [presetId, setPresetId] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const fieldsLocked = isCatalogFormLocked(catalogSelection, manualEdit);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(nameQuery), CATALOG_AUTOCOMPLETE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [nameQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchJson<{ sets: CatalogSetScopeRow[] }>("/api/catalog/sets?limit=120", {
        cache: "no-store",
      });
      if (cancelled) return;
      if (r.kind !== "ok") {
        setCatalogSetsForScope([]);
        return;
      }
      setCatalogSetsForScope(Array.isArray(r.data.sets) ? r.data.sets : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (setMode !== "preset" || !presetId.trim()) return;
    if (!catalogSetsForScope.some((row) => row.id === presetId.trim())) return;
    setCatalogSearchSetId(presetId.trim());
  }, [setMode, presetId, catalogSetsForScope]);

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
      setTcgplayerId(initialValues.catalog_card_id.trim());
    }
    if (initialValues.supertype) {
      setSupertype(initialValues.supertype);
      setType(initialValues.supertype);
    }
    if (Array.isArray(initialValues.subtypes)) {
      setSubtypes(initialValues.subtypes.join(", "));
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
    if (initialValues.set_id?.trim()) {
      setCatalogSearchSetId(initialValues.set_id.trim());
    }
  }, [initialValues]);

  useEffect(() => {
    if (!initialValues?.catalog_card_id?.trim()) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchJson<{ card: CatalogCardDetailRow }>(
        `/api/catalog/cards/${encodeURIComponent(initialValues.catalog_card_id!.trim())}`,
        { cache: "no-store" }
      );
      if (cancelled || r.kind !== "ok") return;
      const sel = catalogDetailToSelection(r.data.card);
      applySelectionToForm(sel, {
        setName,
        setNameQuery,
        setNumber,
        setRarity,
        setImageUrl,
        setCatalogCardId,
        setSetMode,
        setPresetId,
        setSetField,
        setSupertype,
        setSubtypes,
        setType,
        setTcgplayerId,
        setCatalogSelection,
      });
      setManualEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialValues?.catalog_card_id]);

  const applyCatalogHit = useCallback(async (hit: CatalogCardHit) => {
    setCatalogHits([]);
    setCatalogErr(null);
    setActiveHitIndex(-1);
    setManualEdit(false);

    const r = await fetchJson<{ card: CatalogCardDetailRow }>(
      `/api/catalog/cards/${encodeURIComponent(hit.id)}`,
      { cache: "no-store" }
    );
    const sel =
      r.kind === "ok" ? catalogDetailToSelection(r.data.card) : catalogHitToSelection(hit);
    applySelectionToForm(sel, {
      setName,
      setNameQuery,
      setNumber,
      setRarity,
      setImageUrl,
      setCatalogCardId,
      setSetMode,
      setPresetId,
      setSetField,
      setSupertype,
      setSubtypes,
      setType,
      setTcgplayerId,
      setCatalogSelection,
    });
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (fieldsLocked || q.length < 1) {
      setCatalogHits([]);
      setCatalogErr(null);
      setCatalogLoading(false);
      setSearchMode("name");
      return;
    }

    const mode = classifyCatalogQuery(q);
    setSearchMode(mode);
    const resultCap =
      mode === "set" ? CATALOG_SET_SEARCH_LIMIT : CATALOG_AUTOCOMPLETE_LIMIT;

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogErr(null);

    void (async () => {
      try {
        const url = buildCatalogSearchUrlForMode(mode, q, {
          setId: mode === "name" ? catalogSearchSetId.trim() || undefined : undefined,
          limit: resultCap,
        });
        const r = await fetchJson<{
          results: CatalogCardHit[];
          unique?: boolean;
          set_id?: string | null;
        }>(url, { cache: "no-store" });
        if (cancelled) return;
        if (r.kind !== "ok") {
          setCatalogHits([]);
          setCatalogErr(fetchJsonErrorMessage(r));
          return;
        }
        const hits = parseCatalogSearchResults(r.data, resultCap);
        setCatalogHits(hits);
        if (r.data.set_id?.trim()) {
          setCatalogSearchSetId(r.data.set_id.trim());
        }
        const unique =
          mode === "number" &&
          (r.data.unique === true || hits.length === 1) &&
          isAutoDetectNumberQuery(q);
        if (unique && hits[0]) {
          setAutoDetectedFromNumber(true);
          await applyCatalogHit(hits[0]);
        } else {
          setAutoDetectedFromNumber(false);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, catalogSearchSetId, fieldsLocked, applyCatalogHit]);

  useEffect(() => {
    const setId = catalogSelection?.setId?.trim() || catalogSearchSetId.trim();
    const cardNumber = catalogSelection?.number?.trim() || number.trim();
    const selectedId = catalogSelection?.catalogCardId ?? null;

    if (!shouldLoadSuggestions({ binderId, setId, selectedId })) {
      setSuggestionGroups([]);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    void (async () => {
      const recentUrl = `/api/cards/recent?binderId=${encodeURIComponent(binderId)}&limit=12`;
      const nearbyUrl =
        setId && cardNumber
          ? `/api/catalog/cards/nearby?setId=${encodeURIComponent(setId)}&number=${encodeURIComponent(cardNumber)}`
          : null;
      const bySetUrl = setId
        ? `/api/catalog/cards/by-set?setId=${encodeURIComponent(setId)}&limit=24`
        : null;

      const [recentRes, nearbyRes, bySetRes] = await Promise.all([
        fetchJson<{ binderRecent: CatalogCardHit[]; globalRecent: CatalogCardHit[] }>(
          recentUrl,
          { cache: "no-store" }
        ),
        nearbyUrl
          ? fetchJson<{ results: CatalogCardHit[] }>(nearbyUrl, { cache: "no-store" })
          : Promise.resolve(null),
        bySetUrl
          ? fetchJson<{ results: CatalogCardHit[] }>(bySetUrl, { cache: "no-store" })
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const binderRecent =
        recentRes.kind === "ok" ? parseCatalogSearchResults({ results: recentRes.data.binderRecent }, 12) : [];
      const globalRecent =
        recentRes.kind === "ok" ? parseCatalogSearchResults({ results: recentRes.data.globalRecent }, 12) : [];
      const nearby =
        nearbyRes && nearbyRes.kind === "ok"
          ? parseCatalogSearchResults(nearbyRes.data, 12)
          : [];
      const bySet =
        bySetRes && bySetRes.kind === "ok" ? parseCatalogSearchResults(bySetRes.data, 24) : [];

      setSuggestionGroups(
        buildSuggestionGroups({
          binderRecent,
          globalRecent,
          nearby,
          bySet,
          selectedId,
        })
      );
      setSuggestionsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [binderId, catalogSelection, catalogSearchSetId, number]);

  const enableManualEdit = useCallback(() => {
    setManualEdit(true);
    setCatalogHits([]);
    setAutoDetectedFromNumber(false);
  }, []);

  const clearCatalogLink = useCallback(() => {
    setCatalogSelection(null);
    setCatalogCardId(null);
    setManualEdit(true);
    setTcgplayerId("");
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

    if (!fieldsLocked && !manualEdit) {
      const needsRarity = !rarity.trim();
      if (needsRarity && !catalogCardId) {
        /* optional rarity for manual entry */
      }
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

    const created = await fetchJson<BinderAddMutationResponseDTO>("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (created.kind !== "ok") {
      setLoading(false);
      setError(fetchJsonErrorMessage(created));
      return;
    }

    const cardId = created.data.card?.id;
    if (cardId && (frontFile || backFile)) {
      const fd = new FormData();
      if (frontFile) fd.append("front", frontFile);
      if (backFile) fd.append("back", backFile);
      const up = await fetchJson<{ partial?: boolean }>(
        `/api/cards/${encodeURIComponent(cardId)}/images`,
        { method: "POST", body: fd }
      );
      if (up.kind !== "ok") {
        setLoading(false);
        setError(
          `${fetchJsonUserFacingMessage(up)} Your Pokémon card was saved; you can add photos later from card details.`
        );
        requestBinderSurfacesRefresh(binderId);
        router.push(`/binders/${binderId}`);
        router.refresh();
        return;
      }
    }

    setLoading(false);
    requestBinderSurfacesRefresh(binderId);
    router.push(`/binders/${binderId}`);
    router.refresh();
  }

  const inputClass = cn(
    "mca-input mt-0 w-full rounded-mca-card disabled:cursor-not-allowed disabled:opacity-60",
    fieldsLocked && "bg-mca-surface/60"
  );

  const showNoResults =
    !catalogLoading &&
    debouncedQuery.trim().length >= 1 &&
    catalogHits.length === 0 &&
    !catalogErr &&
    !fieldsLocked;

  return (
    <Panel elevated className="max-w-lg border-mca-border bg-mca-surface-elevated/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <form onSubmit={handleSubmit} className="space-y-mca-md">
        {scanEventId ? (
          <p className="rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/40 px-mca-base py-mca-compact text-xs leading-relaxed text-mca-ink-muted">
            This card is linked to a scan. Fields may be prefilled from catalog auto-match — edit
            freely before saving.
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

        <CatalogSuggestionsStrip
          groups={suggestionGroups}
          loading={suggestionsLoading}
          onPick={(hit) => void applyCatalogHit(hit)}
        />

        <Field
          id="card-name"
          label="Card name"
          hint="Search by name, set (e.g. 151, SV2), or number (e.g. 121/088)."
        >
          <CatalogCombobox
            id="card-name"
            value={nameQuery}
            onValueChange={(v) => {
              setName(v);
              setNameQuery(v);
              if (catalogSelection && v !== catalogSelection.name) {
                setCatalogSelection(null);
                setCatalogCardId(null);
                setManualEdit(true);
              }
            }}
            hits={catalogHits}
            loading={catalogLoading}
            error={catalogErr}
            showNoResults={showNoResults}
            activeIndex={activeHitIndex}
            onActiveIndexChange={setActiveHitIndex}
            onPick={(hit) => {
              setAutoDetectedFromNumber(false);
              void applyCatalogHit(hit);
            }}
            onManualEditRequest={enableManualEdit}
            disabled={loading || cardLimitReached}
            searchMode={searchMode}
            listLimit={searchMode === "set" ? CATALOG_SET_SEARCH_LIMIT : CATALOG_AUTOCOMPLETE_LIMIT}
          />
          {autoDetectedFromNumber && catalogSelection && !manualEdit ? (
            <p className="mt-mca-xs inline-flex items-center gap-mca-xs rounded-mca-pill border border-mca-accent-border/40 bg-mca-accent-border/10 px-mca-sm py-mca-tight text-xs font-medium text-mca-accent">
              Auto-detected from number
            </p>
          ) : null}
          {catalogSelection && !manualEdit ? (
            <p className="mt-mca-xs text-xs text-mca-ink-subtle">
              Catalog match applied.{" "}
              <button
                type="button"
                className="font-semibold text-mca-accent underline-offset-2 hover:underline"
                onClick={enableManualEdit}
              >
                Edit manually
              </button>
              {" · "}
              <button
                type="button"
                className="text-mca-ink-muted underline-offset-2 hover:text-mca-ink-body hover:underline"
                onClick={clearCatalogLink}
              >
                Clear catalog link
              </button>
            </p>
          ) : manualEdit && catalogCardId ? (
            <p className="mt-mca-xs text-xs text-mca-ink-subtle">
              Manual edit mode — fields are unlocked.
            </p>
          ) : null}
        </Field>

        {catalogSelection && !manualEdit ? (
          <CatalogCardPreview selection={catalogSelection} />
        ) : null}

        <Field
          id="catalog-add-search-scope"
          label="Catalog search scope"
          hint="Optional — narrows autocomplete to one expansion."
        >
          <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-stretch">
            <select
              id="catalog-add-search-scope"
              value={catalogSearchSetId}
              onChange={(e) => setCatalogSearchSetId(e.target.value)}
              disabled={loading || cardLimitReached || fieldsLocked}
              className={cn(inputClass)}
            >
              <option value="">All catalog sets</option>
              {catalogSetsForScope.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <Link
              href="/catalog/cards/search"
              className="inline-flex shrink-0 items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-chrome/50 px-mca-base py-mca-tight text-center text-xs font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:border-mca-accent-border/40 hover:text-mca-accent sm:w-auto"
            >
              Full catalog search
            </Link>
          </div>
        </Field>

        <div className="grid gap-mca-base sm:grid-cols-2">
          <Field id="card-number" label="Number">
            <input
              id="card-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              disabled={loading || cardLimitReached || fieldsLocked}
              readOnly={fieldsLocked}
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
              disabled={loading || cardLimitReached || fieldsLocked}
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
              disabled={loading || cardLimitReached || fieldsLocked}
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

        {(supertype || subtypes || type || tcgplayerId) && (
          <div className="grid gap-mca-base sm:grid-cols-2">
            <Field id="card-supertype" label="Supertype">
              <input
                id="card-supertype"
                value={supertype}
                onChange={(e) => setSupertype(e.target.value)}
                disabled={loading || cardLimitReached || fieldsLocked}
                readOnly={fieldsLocked}
                className={cn(inputClass)}
              />
            </Field>
            <Field id="card-type" label="Type">
              <input
                id="card-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading || cardLimitReached || fieldsLocked}
                readOnly={fieldsLocked}
                className={cn(inputClass)}
              />
            </Field>
            <Field id="card-subtypes" label="Subtypes" className="sm:col-span-2">
              <input
                id="card-subtypes"
                value={subtypes}
                onChange={(e) => setSubtypes(e.target.value)}
                disabled={loading || cardLimitReached || fieldsLocked}
                readOnly={fieldsLocked}
                className={cn(inputClass)}
                placeholder="e.g. Basic, VMAX"
              />
            </Field>
            {tcgplayerId ? (
              <Field id="card-external-id" label="Catalog id" className="sm:col-span-2">
                <input
                  id="card-external-id"
                  value={tcgplayerId}
                  readOnly
                  disabled
                  className={cn(inputClass, "font-mono text-mca-caption")}
                />
              </Field>
            ) : null}
          </div>
        )}

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
              disabled={loading || cardLimitReached || fieldsLocked}
              readOnly={fieldsLocked}
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
              : fieldsLocked
                ? "From catalog — unlock with Edit manually to change."
                : "External artwork URL if you are not uploading a front photo."
          }
        >
          <input
            id="card-image-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={loading || cardLimitReached || Boolean(frontFile) || fieldsLocked}
            readOnly={fieldsLocked}
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
});
