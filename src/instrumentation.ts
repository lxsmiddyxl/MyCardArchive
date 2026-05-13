/**
 * Next.js instrumentation hook (Node.js runtime).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import { logServerError } from "@/lib/server/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { assertRequiredPublicEnv } = await import("./lib/server/env-guards");
    const { assertProductionEnvParity } = await import("./lib/server/env-parity");
    if (process.env.NODE_ENV === "production") {
      assertRequiredPublicEnv();
      assertProductionEnvParity();
    }
  } catch (e) {
    logServerError({ scope: "system", route: "instrumentation.register", err: e });
    throw e;
  }
}
