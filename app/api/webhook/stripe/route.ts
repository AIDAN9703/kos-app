import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/features/payments/payments.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhook/stripe
 * Stripe events (checkout completed, invoice paid, charge refunded). A bad
 * signature is a 400; a failure while settling is a 500, so Stripe retries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await (await request.blob()).text();
    await handleStripeWebhook(body, request.headers.get("stripe-signature"));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorFrom(error, "Webhook processing failed");
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    endpoint: "/api/webhook/stripe",
    method: "POST",
  });
}
