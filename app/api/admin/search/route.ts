import { NextResponse } from 'next/server';
import { getSession } from '@/shared/lib/utils/auth-utils';
import { db } from '@/database/db';
import { bookings, boats, users } from '@/database/schema';
import { ilike, or, desc, eq } from 'drizzle-orm';

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  type: 'user' | 'boat' | 'booking' | string;
  url: string;
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Defense-in-depth: middleware also guards /api/admin, but never rely on it alone.
  const session = await getSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const [userResults, boatResults, bookingResults] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username
      })
      .from(users)
      .where(
        or(
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.username, `%${query}%`)
        )
      )
      .limit(5),
    db
      .select({
        id: boats.id,
        name: boats.name,
        locationLabel: boats.locationLabel
      })
      .from(boats)
      .where(
        or(
          ilike(boats.name, `%${query}%`),
          ilike(boats.make, `%${query}%`),
          ilike(boats.model, `%${query}%`),
          ilike(boats.locationLabel, `%${query}%`)
        )
      )
      .limit(5),
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        bookingStatus: bookings.bookingStatus,
        boatName: boats.name
      })
      .from(bookings)
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(
        or(
          ilike(bookings.customerName, `%${query}%`),
          ilike(bookings.customerEmail, `%${query}%`)
        )
      )
      .orderBy(desc(bookings.startDateTime))
      .limit(5)
  ]);

  const results: SearchResult[] = [
    ...userResults.map((user) => ({
      id: user.id,
      title: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        user.username ||
        user.email,
      subtitle: user.email ?? undefined,
      type: 'user',
      url: `/admin/users/${user.id}`
    })),
    ...boatResults.map((boat) => ({
      id: boat.id,
      title: boat.name,
      subtitle: boat.locationLabel ?? undefined,
      type: 'boat',
      url: `/admin/boats/${boat.id}`
    })),
    ...bookingResults.map((booking) => ({
      id: booking.id,
      title: booking.customerName,
      subtitle: booking.boatName
        ? `${booking.boatName} · ${String(booking.bookingStatus).toLowerCase()}`
        : String(booking.bookingStatus).toLowerCase(),
      type: 'booking',
      url: `/admin/bookings/${booking.id}`
    }))
  ];

  return NextResponse.json({ results });
}