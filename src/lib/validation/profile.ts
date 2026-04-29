/**
 * Profile field sanitization, profanity checks, and validation for display names and handles.
 * Server and client share this module; API enforces again on save.
 */

import { censor, isOffensive } from "@/lib/validation/profanity";

const HANDLE_RE = /^[a-z0-9_]+$/;
const REPEATED_PUNCT = /([!?.,:;#\-+])\1{2,}/g;

export { isOffensive } from "@/lib/validation/profanity";

export function sanitizeDisplayName(name: string): string {
  let s = name.trim();
  s = s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F/gu, "");
  s = s.replace(REPEATED_PUNCT, "$1$1");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

export function sanitizeHandle(handle: string): string {
  let s = handle.trim();
  if (s.startsWith("@")) s = s.slice(1);
  s = s.toLowerCase();
  s = s.replace(/\s/g, "");
  s = s.replace(/[^a-z0-9_]/g, "");
  return s;
}

/** @deprecated Use `censor` from profanity */
export function maskVowels(s: string): string {
  return censor(s);
}

/** Deterministic handle suffix 1000–9999 from id. */
export function deterministicTrainerSuffix(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}

export function fallbackDisplayName(userId: string): string {
  return `Trainer${deterministicTrainerSuffix(userId)}`;
}

export function fallbackHandle(userId: string): string {
  return `trainer_${deterministicTrainerSuffix(userId)}`;
}

/**
 * If text is still offensive after mask, return fallback name.
 */
export function coerceDisplayName(sanitized: string, userId: string): { value: string; adjusted: boolean } {
  if (!isOffensive(sanitized)) {
    return { value: sanitized, adjusted: false };
  }
  const masked = censor(sanitized);
  if (!isOffensive(masked) && masked.trim().length >= 2) {
    return { value: masked, adjusted: true };
  }
  return { value: fallbackDisplayName(userId), adjusted: true };
}

export function coerceHandle(sanitized: string, userId: string): { value: string; adjusted: boolean } {
  if (!sanitized) return { value: fallbackHandle(userId), adjusted: true };
  if (!isOffensive(sanitized)) {
    return { value: sanitized, adjusted: false };
  }
  const masked = censor(sanitized);
  if (!isOffensive(masked) && HANDLE_RE.test(masked) && masked.length >= 3) {
    return { value: masked, adjusted: true };
  }
  return { value: fallbackHandle(userId), adjusted: true };
}

const DISPLAY_MIN = 2;
const DISPLAY_MAX = 32;
const HANDLE_MIN = 3;
const HANDLE_MAX = 24;
const BIO_MAX = 280;
const LOCATION_MAX = 80;
const WEBSITE_MAX = 200;
const FAVORITE_MAX = 80;
const COLOR_MAX = 32;

export type ProfileInput = {
  display_name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  website?: string;
  favorite_card?: string;
  favorite_set?: string;
  favorite_color?: string;
};

export function validateProfileInput(data: ProfileInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const display = data.display_name !== undefined ? sanitizeDisplayName(String(data.display_name)) : "";
  const handle = data.handle !== undefined ? sanitizeHandle(String(data.handle)) : "";
  const bio = data.bio !== undefined ? String(data.bio).trim() : "";
  const location = data.location !== undefined ? String(data.location).trim() : "";
  const website = data.website !== undefined ? String(data.website).trim() : "";
  const favoriteCard =
    data.favorite_card !== undefined ? String(data.favorite_card).trim().slice(0, FAVORITE_MAX) : "";
  const favoriteSet =
    data.favorite_set !== undefined ? String(data.favorite_set).trim().slice(0, FAVORITE_MAX) : "";
  const favoriteColor =
    data.favorite_color !== undefined ? String(data.favorite_color).trim().slice(0, COLOR_MAX) : "";

  if (data.display_name !== undefined) {
    if (display.length < DISPLAY_MIN || display.length > DISPLAY_MAX) {
      errors.push(`Display name must be between ${DISPLAY_MIN} and ${DISPLAY_MAX} characters.`);
    } else if (isOffensive(display)) {
      errors.push("This name is not allowed.");
    }
  }

  if (data.handle !== undefined && handle) {
    if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
      errors.push(`Handle must be between ${HANDLE_MIN} and ${HANDLE_MAX} characters.`);
    } else if (!HANDLE_RE.test(handle)) {
      errors.push("Handle may only use letters, numbers, and underscores.");
    } else if (isOffensive(handle)) {
      errors.push("This name is not allowed.");
    }
  }

  if (data.bio !== undefined && bio.length > BIO_MAX) {
    errors.push(`Bio must be at most ${BIO_MAX} characters.`);
  } else if (data.bio !== undefined && bio && isOffensive(bio)) {
    errors.push("This content is not allowed.");
  }

  if (data.location !== undefined && location.length > LOCATION_MAX) {
    errors.push(`Location must be at most ${LOCATION_MAX} characters.`);
  } else if (data.location !== undefined && location && isOffensive(location)) {
    errors.push("This content is not allowed.");
  }

  if (data.website !== undefined && website) {
    if (website.length > WEBSITE_MAX) {
      errors.push(`Website URL must be at most ${WEBSITE_MAX} characters.`);
    } else {
      const lower = website.toLowerCase();
      if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
        errors.push("Website must start with http:// or https://");
      } else if (isOffensive(website)) {
        errors.push("This content is not allowed.");
      } else {
        try {
          // eslint-disable-next-line no-new -- only validate URL shape
          new URL(website);
        } catch {
          errors.push("Invalid website URL.");
        }
      }
    }
  }

  if (data.favorite_card !== undefined && favoriteCard && isOffensive(favoriteCard)) {
    errors.push("This content is not allowed.");
  }
  if (data.favorite_set !== undefined && favoriteSet && isOffensive(favoriteSet)) {
    errors.push("This content is not allowed.");
  }
  if (data.favorite_color !== undefined && favoriteColor && isOffensive(favoriteColor)) {
    errors.push("This content is not allowed.");
  }

  return { valid: errors.length === 0, errors };
}

export const PROFILE_LIMITS = {
  displayMin: DISPLAY_MIN,
  displayMax: DISPLAY_MAX,
  handleMin: HANDLE_MIN,
  handleMax: HANDLE_MAX,
  bioMax: BIO_MAX,
  locationMax: LOCATION_MAX,
  websiteMax: WEBSITE_MAX,
  favoriteMax: FAVORITE_MAX,
  colorMax: COLOR_MAX,
} as const;
