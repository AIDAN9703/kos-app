import { NextRequest, NextResponse } from "next/server";
import { verifyCheckout } from "@/features/payments/payments.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/verify?session_id=cs_...
 * The payment-success page: confirms the checkout, books the party if the
 * webhook hasn't yet, and returns what was paid (202 while still processing).
 */
export async function GET(request: NextRequest) {
  try {
    const result = await verifyCheckout(request.nextUrl.searchParams.get("session_id"));
    if (result.processing) {
      return NextResponse.json({ success: true, message: result.message }, { status: 202 });
    }
    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      status: "BOOKED",
      booking: result.booking,
    });
  } catch (error) {
    return apiErrorFrom(error, "Failed to verify payment");
  }
}
