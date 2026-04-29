/**
 * One-time Stripe catalog setup for MyCardArchive.
 *
 * Usage (from repo root):
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-create-products.mjs
 *
 * Creates products + recurring prices for Free ($0), Pro, and Elite.
 * Copy the printed price IDs into your server environment (see .env.example).
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Set STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(key);

async function main() {
  const freeProduct = await stripe.products.create({
    name: "MyCardArchive Free",
    description: "App default tier — not sold via Checkout; catalog reference only.",
    metadata: { tier_slug: "free" },
  });

  const freePrice = await stripe.prices.create({
    product: freeProduct.id,
    currency: "usd",
    unit_amount: 0,
    recurring: { interval: "month" },
    metadata: { tier_slug: "free" },
  });

  const proProduct = await stripe.products.create({
    name: "MyCardArchive Pro",
    description: "Pro subscription for MyCardArchive.",
    metadata: { tier_slug: "pro" },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    currency: "usd",
    unit_amount: 499,
    recurring: { interval: "month" },
    metadata: { tier_slug: "pro" },
  });

  const eliteProduct = await stripe.products.create({
    name: "MyCardArchive Elite",
    description: "Elite subscription for MyCardArchive.",
    metadata: { tier_slug: "elite" },
  });

  const elitePrice = await stripe.prices.create({
    product: eliteProduct.id,
    currency: "usd",
    unit_amount: 1999,
    recurring: { interval: "month" },
    metadata: { tier_slug: "elite" },
  });

  console.log("\n--- Add these to your environment (server) ---\n");
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
  console.log(`STRIPE_PRICE_ELITE=${elitePrice.id}`);
  console.log("\n# Optional: yearly prices — create in Dashboard or extend this script, then:");
  console.log("# STRIPE_PRICE_PRO_YEARLY=price_...");
  console.log("# STRIPE_PRICE_ELITE_YEARLY=price_...");
  console.log("\n# Free tier reference (not required in app env):");
  console.log(`# FREE_CATALOG_PRICE_ID=${freePrice.id}`);
  console.log("\nProducts created:", {
    free: freeProduct.id,
    pro: proProduct.id,
    elite: eliteProduct.id,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
