"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { cn } from "@/lib/ui/cn";
import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type CardImageUploadProps = {
  id: string;
  label: string;
  hint?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

/**
 * File picker + drag/drop for card scans — matches the /scan capture UX (single image field).
 */
export function CardImageUpload({
  id,
  label,
  hint,
  file,
  onFileChange,
  disabled,
}: CardImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      onFileChange(f ?? null);
      e.target.value = "";
    },
    [onFileChange]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f && f.type.startsWith("image/")) {
        onFileChange(f);
      }
    },
    [disabled, onFileChange]
  );

  return (
    <Field id={id} label={label} hint={hint} disabled={disabled}>
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={id}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        className={cn(
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-mca-card border-2 border-dashed px-mca-base py-mca-lg text-center transition-all duration-200 ease-mca-standard outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60",
          isDragging
            ? "border-mca-accent-strong/60 bg-mca-warning-surface/20"
            : "border-mca-border-subtle bg-mca-surface/40 hover:border-mca-field-border hover:bg-mca-surface-elevated/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onInputChange}
          disabled={disabled}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="max-h-32 w-auto max-w-[200px] rounded-mca-block border border-mca-border-subtle object-contain"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-mca-ink-soft">
              Drop image or click to browse
            </p>
            <p className="mt-mca-xs text-xs text-mca-ink-subtle">PNG, JPG, WebP</p>
          </>
        )}
        <div className="mt-mca-compact flex flex-wrap justify-center gap-mca-sm">
          <Button type="button" variant="secondary" onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }} disabled={disabled}>
            Choose file
          </Button>
          {file ? (
            <Button
              type="button"
              variant="tertiary"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              disabled={disabled}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </Field>
  );
}
