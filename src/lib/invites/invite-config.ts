/** Cookie set after invite validation (httpOnly, set by API). */
export const MCA_INVITE_COOKIE = "mca_invite_code" as const;

export function isInviteGateEnabled(): boolean {
  const v = process.env.MCA_INVITE_REQUIRED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function parseAdminEmails(): string[] {
  return (
    process.env.MCA_ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) ??
    []
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.trim().toLowerCase());
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateInviteCode(): string {
  const bytes = new Uint8Array(5);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
