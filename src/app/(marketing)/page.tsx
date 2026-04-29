import { redirect } from "next/navigation";

/**
 * Root `/` lands on the primary in-app surface (`/feed`). Unauthenticated users are
 * sent to login by middleware when they hit `/feed`.
 */
export default function HomeRedirectPage() {
  redirect("/feed");
}
