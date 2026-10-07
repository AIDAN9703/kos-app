/**
 * Server configuration read from the environment.
 *
 * Stripe runs on live keys only on the production deployment. Vercel sets
 * VERCEL_ENV ("production" | "preview" | "development"), so preview
 * deployments use test keys and never charge real cards. Off Vercel (local
 * dev, scripts) NODE_ENV decides, as before.
 */
const stripeLive = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

const config = {
  databaseUrl: process.env.DATABASE_URL!,
  /** True when Stripe is on live keys; events and dashboard links must match. */
  stripeLive,
  stripeSecretKey: stripeLive ? process.env.STRIPE_LIVE_SECRET_KEY! : process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: stripeLive
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET!
    : process.env.STRIPE_WEBHOOK_SECRET!,
};

export default config;
