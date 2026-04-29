import type { UserTierRecord } from "@/lib/tier/check-limits";

/** Normalize legacy tier slugs to canonical scan policy buckets. */
export function scanTierBucket(
  tier: UserTierRecord | null
): "free" | "pro" | "elite" | "business" | "unknown" {
  if (!tier?.tier_slug) return "unknown";
  const s = tier.tier_slug.trim().toLowerCase();
  if (s === "free" || s === "ember") return "free";
  if (s === "pro" || s === "spark") return "pro";
  if (s === "elite" || s === "nova" || s === "apex") return "elite";
  if (s === "business") return "business";
  return "unknown";
}

export function isFreeScanTier(tier: UserTierRecord | null): boolean {
  const b = scanTierBucket(tier);
  return b === "free" || b === "unknown";
}

export function isEliteScanTier(tier: UserTierRecord | null): boolean {
  return scanTierBucket(tier) === "elite";
}

export function isBusinessTier(tier: UserTierRecord | null): boolean {
  return scanTierBucket(tier) === "business";
}

/** Elite and Business share priority queue access. */
export function isPriorityQueueTier(tier: UserTierRecord | null): boolean {
  return isEliteScanTier(tier) || isBusinessTier(tier);
}

function truthyFormFlag(v: FormDataEntryValue | null): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * Returns a user-facing error string if this multipart scan must be rejected for the tier, else null.
 * Call after `assertCanCreateScan` and parsing `FormData`.
 */
export function validateScanMultipartForTier(
  tier: UserTierRecord | null,
  formData: FormData
): string | null {
  const free = isFreeScanTier(tier);
  const priorityOk = isPriorityQueueTier(tier);

  const imageFiles = formData
    .getAll("image")
    .filter((x): x is File => x instanceof File && x.size > 0);

  if (imageFiles.length > 1) {
    if (free) {
      return "Free tier supports one image per scan. Batch scanning is a Pro feature — upgrade on /tier.";
    }
    return "Send one image per scan request. Use batch mode in the app to queue multiple scans.";
  }

  if (!free) {
    if (truthyFormFlag(formData.get("queue_priority")) && !priorityOk) {
      return "Priority scanning is an Elite or Business feature. Upgrade on /tier.";
    }
    return null;
  }

  const blocked: Array<[string, string]> = [
    ["batch", "Batch scanning is a Pro feature. Upgrade on /tier to unlock it."],
    ["multi_scan", "Multi-scan mode is a Pro feature. Upgrade on /tier."],
    ["auto_crop", "Auto-crop is a Pro feature. Upgrade on /tier."],
    ["auto_rotate", "Auto-rotate is a Pro feature. Upgrade on /tier."],
    ["queue_priority", "Priority scanning is an Elite or Business feature. Upgrade on /tier."],
    ["rerun_scan_id", "Re-scan shortcuts are not available on the Free tier. Upgrade on /tier."],
    ["clone_from_scan", "Re-scan shortcuts are not available on the Free tier. Upgrade on /tier."],
    ["from_scan_event", "Re-scan shortcuts are not available on the Free tier. Upgrade on /tier."],
    ["fast_lane", "Priority scanning is an Elite or Business feature. Upgrade on /tier."],
    ["skip_manual", "Automated scan intake is not available on the Free tier. Upgrade on /tier."],
  ];

  for (const [key, message] of blocked) {
    if (truthyFormFlag(formData.get(key))) {
      return message;
    }
  }

  return null;
}

/** Persisted on the scan payload for analytics / future pipeline (does not change AI today). */
export function readPaidScanClientOptions(
  tier: UserTierRecord | null,
  formData: FormData
): { auto_crop: boolean; auto_rotate: boolean } | undefined {
  if (isFreeScanTier(tier)) return undefined;
  const auto_crop = truthyFormFlag(formData.get("auto_crop"));
  const auto_rotate = truthyFormFlag(formData.get("auto_rotate"));
  if (!auto_crop && !auto_rotate) return undefined;
  return { auto_crop, auto_rotate };
}
