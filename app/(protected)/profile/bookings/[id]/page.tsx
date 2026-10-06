import { notFound } from "next/navigation";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { TripDetailView } from "@/features/profile/components/trips/TripDetailView";
import { getMyTrip } from "@/features/profile/profile.data";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireAuth(), params]);
  // Only the signed-in person's own trips: someone else's booking id is a 404, not a leak.
  const trip = await getMyTrip(id);
  if (!trip) notFound();

  return <TripDetailView trip={trip} />;
}
