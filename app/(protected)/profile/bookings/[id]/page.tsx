import { notFound } from "next/navigation";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { TripDetailView } from "@/features/profile/components/trips/TripDetailView";
import { getTrip } from "@/features/profile/profile.queries";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  // getTrip is scoped to the signed-in user: someone else's booking id is a 404, not a leak.
  const trip = await getTrip(session.user.id, id);
  if (!trip) notFound();

  return <TripDetailView trip={trip} />;
}
