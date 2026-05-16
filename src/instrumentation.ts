/**
 * Next.js instrumentation hook (Node.js runtime).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import { logServerError } from "@/lib/server/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { loadProductionEnv } = await import("./mca-utils/env/load");
    const { assertRequiredProductionEnv } = await import("./mca-utils/env/required");
    if (process.env.NODE_ENV === "production") {
      loadProductionEnv({ throwOnError: true });
      const check = assertRequiredProductionEnv();
      if (!check.ok) {
        throw new Error(check.errors.join("; "));
      }
    }
  } catch (e) {
    logServerError({ scope: "system", route: "instrumentation.register", err: e });
    throw e;
  }
}
