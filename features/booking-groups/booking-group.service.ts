import "server-only";

/**
 * Booking Group Service
 * A group ties multiple boat bookings into one charter party. Creation is the
 * only operation the current flow needs; sibling lookups go through
 * bookings.bookingGroupId directly. (Rebuild plan: memory booking-groups-audit.)
 */

import { db } from "@/database/db";
import { bookingGroups } from "@/database/schema";

interface CreateBookingGroupInput {
  name?: string | null;
  notes?: string | null;
  createdById?: string | null;
}

export const bookingGroupService = {
  async create(input: CreateBookingGroupInput) {
    const [group] = await db
      .insert(bookingGroups)
      .values({
        name: input.name ?? null,
        notes: input.notes ?? null,
        createdById: input.createdById ?? null,
      })
      .returning();
    return group;
  },
};
