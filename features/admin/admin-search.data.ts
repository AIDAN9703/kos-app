import "server-only";

import { searchAll } from "@/features/admin/admin-search.service";
import { assertCan } from "@/shared/lib/utils/auth-utils";

/** The admin command bar's search (needs the user list, the fleet and every deal). */

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  type: "user" | "boat" | "booking";
  url: string;
};

export async function searchAdmin(rawQuery: string): Promise<SearchResult[]> {
  await assertCan({ user: ["list"], boat: ["edit"], booking: ["view-all"] });
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const { people, fleet, deals } = await searchAll(query);
  return [
    ...people.map((user) => ({
      id: user.id,
      title: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || user.email,
      subtitle: user.email ?? undefined,
      type: "user" as const,
      url: `/admin/users/${user.id}`,
    })),
    ...fleet.map((boat) => ({
      id: boat.id,
      title: boat.name,
      subtitle: boat.locationLabel ?? undefined,
      type: "boat" as const,
      url: `/admin/boats/${boat.id}`,
    })),
    ...deals.map((booking) => ({
      id: booking.id,
      title: booking.customerName,
      subtitle: booking.boatName
        ? `${booking.boatName} · ${String(booking.bookingStatus).toLowerCase()}`
        : String(booking.bookingStatus).toLowerCase(),
      type: "booking" as const,
      url: `/admin/bookings/${booking.id}`,
    })),
  ];
}
