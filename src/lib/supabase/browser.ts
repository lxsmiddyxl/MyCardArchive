import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The only browser-side Supabase client. Persists session via `@supabase/ssr` storage.
 * Use from `"use client"` components only — never from Server Components.
 */
export const supabaseBrowser = (): SupabaseClient<Database> =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as SupabaseClient<Database>;
