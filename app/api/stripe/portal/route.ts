import { NextResponse } from "next/server";
import { openMyBillingPortal } from "@/features/profile/profile.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 * A Stripe Customer Portal session for the signed-in person (invoices,
 * receipts, payment history). Returns its URL.
 */
export async function POST() {
  try {
    return NextResponse.json({ url: await openMyBillingPortal() });
  } catch (error) {
    return apiErrorFrom(error, "Failed to create billing portal session");
  }
}
