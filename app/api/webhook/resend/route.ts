import { NextResponse } from "next/server";
import { handleResendWebhook } from "@/features/marketing/marketing.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhook/resend
 * Resend's events (contact.updated, contact.deleted, email.complained): a
 * marketing contact unsubscribed, here and on their account. Signed with
 * RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  try {
    await handleResendWebhook(await request.text(), {
      id: request.headers.get("svix-id") ?? "",
      timestamp: request.headers.get("svix-timestamp") ?? "",
      signature: request.headers.get("svix-signature") ?? "",
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiErrorFrom(error, "Webhook failed");
  }
}
