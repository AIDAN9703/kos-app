import { NextResponse } from "next/server";
import { receiveInboundEmail } from "@/features/bookings/inbound-email.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const runtime = "nodejs";

/**
 * POST /api/inbound-email
 * Marketplace notification emails forwarded by Resend (signed with svix).
 */
export async function POST(request: Request) {
  try {
    return NextResponse.json(await receiveInboundEmail(await request.text(), request.headers));
  } catch (error) {
    return apiErrorFrom(error, "Inbound email not processed");
  }
}
