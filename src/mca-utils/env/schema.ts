import { z } from "zod";

/** Public env — available in browser and server. */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

/** Server-only production env. */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SENTRY_DSN: z.string().url().optional(),
  MCA_EMBED_ALLOWLIST: z.string().optional(),
  MCA_INVITE_REQUIRED: z.enum(["true", "false", "1", "0", "yes", "no"]).optional(),
  MCA_ADMIN_EMAILS: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
});

export const productionEnvSchema = publicEnvSchema.merge(serverEnvSchema);

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ProductionEnv = z.infer<typeof productionEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined> = process.env
): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL?.trim(),
  });
}

export function parseProductionEnv(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): ProductionEnv {
  return productionEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    SENTRY_DSN: source.SENTRY_DSN?.trim(),
    MCA_EMBED_ALLOWLIST: source.MCA_EMBED_ALLOWLIST?.trim(),
    MCA_INVITE_REQUIRED: source.MCA_INVITE_REQUIRED?.trim(),
    MCA_ADMIN_EMAILS: source.MCA_ADMIN_EMAILS?.trim(),
    VERCEL_TOKEN: source.VERCEL_TOKEN?.trim(),
    VERCEL_PROJECT_ID: source.VERCEL_PROJECT_ID?.trim(),
  });
}
