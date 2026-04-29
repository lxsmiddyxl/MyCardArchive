import "server-only";

/**
 * Server-side Supabase client (`createServerClient` / cookies).
 * Do not import this module from `"use client"` components — use `@/lib/supabase/browser`.
 */
export { createClient } from "@/lib/supabase/server";
