import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type Stripe from "stripe";
import { tierSlugFromStripePriceId } from "@/lib/billing/price-to-tier";

type ServiceClient = SupabaseClient<Database>;

export async function resolveUserIdForStripeCustomer(
  supabase: ServiceClient,
  customerId: string | null | undefined
): Promise<string | null> {
  if (!customerId) {
    return null;
  }
  const { data } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

/** Applies free/pro/elite from an active Stripe subscription item price. */
export async function syncUserTierFromSubscription(
  supabase: ServiceClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerRaw = subscription.customer;
  const customerId =
    typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
  const userId = await resolveUserIdForStripeCustomer(supabase, customerId);
  if (!userId) {
    return;
  }

  const status = subscription.status;
  const treatsAsPaid = status === "active" || status === "trialing";

  if (!treatsAsPaid) {
    await supabase.rpc("apply_billing_user_tier", {
      p_user_id: userId,
      p_tier_slug: "free",
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const paid = tierSlugFromStripePriceId(priceId);
  const slug = paid ?? "free";

  await supabase.rpc("apply_billing_user_tier", {
    p_user_id: userId,
    p_tier_slug: slug,
  });
}
