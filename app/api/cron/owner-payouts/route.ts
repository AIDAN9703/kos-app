import { NextRequest, NextResponse } from "next/server";
import { runOwnerPayouts } from "@/features/owner-accounts/owner-payouts.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/owner-payouts
 * Vercel Cron (vercel.json), daily: pays direct deposit owners for charters
 * that ended at least a day ago.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await runOwnerPayouts(request.headers.get("authorization")));
  } catch (error) {
    return apiErrorFrom(error, "Owner payouts failed");
  }
}
