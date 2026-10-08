import { NextRequest, NextResponse } from "next/server";
import { runScheduledMarketingSync } from "@/features/marketing/marketing.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/marketing-sync
 * Vercel Cron (vercel.json): add new accounts and booked customers to the
 * marketing list and push waiting contact changes to Resend.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await runScheduledMarketingSync(request.headers.get("authorization")));
  } catch (error) {
    return apiErrorFrom(error, "Marketing sync failed");
  }
}
