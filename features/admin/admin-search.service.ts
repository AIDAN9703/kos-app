import "server-only";

import { desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/database/db";
import { bookings, boats, users } from "@/database/schema";

/**
 * The admin command bar's search across people, boats and bookings.
 * Server-only and not access-checked: admin-search.data.ts checks the admin.
 */
export async function searchAll(query: string) {
  const term = `%${query}%`;
  const [people, fleet, deals] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
      })
      .from(users)
      .where(
        or(
          ilike(users.firstName, term),
          ilike(users.lastName, term),
          ilike(users.email, term),
          ilike(users.username, term)
        )
      )
      .limit(5),
    db
      .select({ id: boats.id, name: boats.name, locationLabel: boats.locationLabel })
      .from(boats)
      .where(
        or(
          ilike(boats.name, term),
          ilike(boats.make, term),
          ilike(boats.model, term),
          ilike(boats.locationLabel, term)
        )
      )
      .limit(5),
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        bookingStatus: bookings.bookingStatus,
        boatName: boats.name,
      })
      .from(bookings)
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(or(ilike(bookings.customerName, term), ilike(bookings.customerEmail, term)))
      .orderBy(desc(bookings.startDateTime))
      .limit(5),
  ]);
  return { people, fleet, deals };
}
