import { NextResponse } from "next/server";
import { getStripe, getOrCreateStripeCustomer } from "@/shared/lib/services/stripe.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { getSession } from "@/shared/lib/utils/auth-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session and returns the URL.
 * Customers can view invoices, receipts, and payment history.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      session.user.email,
      session.user.name,
      session.user.id,
    );

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl()}/profile/bookings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating Stripe portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 },
    );
  }
}
