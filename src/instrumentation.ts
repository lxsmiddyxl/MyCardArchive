/**
 * Next.js instrumentation hook (Node.js runtime).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import { logServerError } from "@/lib/server/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { assertRequiredPublicEnv } = await import("./lib/server/env-guards");
    if (process.env.NODE_ENV === "production") {
      assertRequiredPublicEnv();
    }
  } catch (e) {
    logServerError({ scope: "system", route: "instrumentation.register", err: e });
    throw e;
  }
}
