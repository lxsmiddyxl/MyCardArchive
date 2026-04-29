import { redirect } from "next/navigation";

/** Alias URL — full experience lives on `/tier`. */
export default function PricingPage() {
  redirect("/tier");
}
