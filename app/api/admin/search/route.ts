import { NextRequest, NextResponse } from "next/server";
import { searchAdmin } from "@/features/admin/admin-search.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/search?q=...
 * The command bar: people, boats and bookings matching the query.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ results: await searchAdmin(request.nextUrl.searchParams.get("q") ?? "") });
  } catch (error) {
    return apiErrorFrom(error, "Search failed");
  }
}
