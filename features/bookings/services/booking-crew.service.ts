import "server-only";

/**
 * Booking ↔ crew assignments (junction table).
 */

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/database/db";
import { bookingCrew, users } from "@/database/schema";

import { bookingEventsService } from "@/features/bookings/services/booking-events.service";

export class BookingCrewService {
  async listByBookingId(bookingId: string) {
    return db
      .select({
        id: bookingCrew.id,
        userId: bookingCrew.userId,
        role: bookingCrew.role,
        sortOrder: bookingCrew.sortOrder,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(bookingCrew)
      .innerJoin(users, eq(bookingCrew.userId, users.id))
      .where(eq(bookingCrew.bookingId, bookingId))
      .orderBy(asc(bookingCrew.sortOrder), asc(users.lastName), asc(users.firstName));
  }

  async addMember(
    bookingId: string,
    userId: string,
    performedByUserId: string,
    role?: string | null
  ): Promise<void> {
    const [row] = await db
      .insert(bookingCrew)
      .values({
        bookingId,
        userId,
        role: role ?? null,
        updatedAt: new Date(),
      })
      .returning({ id: bookingCrew.id, userId: bookingCrew.userId });

    if (row) {
      await bookingEventsService.logBookingCrewMemberAdded({
        bookingId,
        actorId: performedByUserId,
        bookingCrewId: row.id,
        crewUserId: row.userId,
        role: role ?? null,
      });
    }
  }

  async removeMember(
    bookingCrewId: string,
    bookingId: string,
    performedByUserId: string
  ): Promise<void> {
    const [existing] = await db
      .select({ userId: bookingCrew.userId })
      .from(bookingCrew)
      .where(
        and(eq(bookingCrew.id, bookingCrewId), eq(bookingCrew.bookingId, bookingId))
      )
      .limit(1);

    if (!existing) {
      return;
    }

    await db
      .delete(bookingCrew)
      .where(
        and(eq(bookingCrew.id, bookingCrewId), eq(bookingCrew.bookingId, bookingId))
      );

    await bookingEventsService.logBookingCrewMemberRemoved({
      bookingId,
      actorId: performedByUserId,
      bookingCrewId,
      crewUserId: existing.userId,
    });
  }
}

export const bookingCrewService = new BookingCrewService();
