import "server-only";

import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/database/db";
import { bookings, users } from "@/database/schema";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";

/**
 * Guest-first loop closer: bookings are created with a contact snapshot and
 * no user row; when that person later gets an account, their history should
 * simply appear. This links every guest booking (user_id IS NULL) whose
 * snapshot matches one of the user's VERIFIED channels — Google-verified
 * email, OTP-verified phone — so nobody can read a stranger's bookings by
 * signing up with their email. `adminAsserted` skips the verified checks for
 * admin-created users, where the admin is vouching for the identity.
 *
 * Idempotent and cheap (guest rows only); safe to call on every signup,
 * OAuth first-login, phone-verify completion, and admin user-create.
 */
export async function claimGuestBookingsForUser(
  userId: string,
  options: { adminAsserted?: boolean } = {}
): Promise<number> {
  const [user] = await db
    .select({
      email: users.email,
      emailVerified: users.emailVerified,
      phoneNumber: users.phoneNumber,
      phoneVerified: users.phoneVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return 0;

  const matches: SQL[] = [];
  if (user.email && (user.emailVerified || options.adminAsserted)) {
    matches.push(sql`LOWER(${bookings.customerEmail}) = LOWER(${user.email})`);
  }
  if (user.phoneNumber && (user.phoneVerified || options.adminAsserted)) {
    matches.push(eq(bookings.customerPhone, user.phoneNumber));
  }
  if (matches.length === 0) return 0;

  const claimed = await db
    .update(bookings)
    .set({ userId, updatedAt: new Date() })
    .where(and(isNull(bookings.userId), or(...matches)))
    .returning({ id: bookings.id });

  for (const row of claimed) {
    await bookingEventsService.logEvent({
      bookingId: row.id,
      eventType: BOOKING_EVENT_TYPES.LINKED_TO_ACCOUNT,
      actorType: "system",
      channel: "system",
      displayMessage: "Linked to the customer's new account",
      metadata: { userId, adminAsserted: options.adminAsserted ?? false },
    });
  }
  return claimed.length;
}
