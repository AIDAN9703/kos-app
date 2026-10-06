import "server-only";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/db";
import { bookings } from "@/database/schema";
import { can, getSession, type AppSession } from "@/shared/lib/utils/auth-utils";
import type { statement } from "@/shared/lib/auth/permissions";

/**
 * Who may act on a deal. Admins act on every deal; a broker acts only on the
 * deals assigned to them, and only within their role (shared/lib/auth/
 * permissions.ts). Every deal action and page asks here.
 */

export type DealAction = (typeof statement.booking)[number];

export async function requireDealAccess(
  bookingId: string,
  action: DealAction
): Promise<{ session: AppSession; error?: never } | { session?: never; error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const { user } = session;
  if (!can(user, { booking: [action] })) return { error: "You don't have access to that." };
  if (can(user, { booking: ["view-all"] })) return { session };

  const [deal] = await db
    .select({ assignedAdminId: bookings.assignedAdminId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!deal) return { error: "Deal not found" };
  if (deal.assignedAdminId !== user.id) return { error: "This deal isn't assigned to you." };
  return { session };
}

/** Where this person opens deals: the admin board or the broker portal. */
export function dealsBasePath(session: AppSession): string {
  return can(session.user, { booking: ["view-all"] }) ? "/admin/bookings" : "/brokers/deals";
}

/** Refresh every page that shows this deal: admin board, dashboard and broker portal. */
export function revalidateDeal(bookingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/brokers");
  if (bookingId) {
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath(`/brokers/deals/${bookingId}`);
  }
}
