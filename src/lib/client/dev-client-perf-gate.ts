/** No `"use client"` — safe to import from Vitest and server utilities. */
export function isDevelopmentNodeEnv(): boolean {
  return process.env.NODE_ENV === "development";
}
