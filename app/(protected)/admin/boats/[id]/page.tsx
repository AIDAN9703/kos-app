import { notFound } from "next/navigation";
import { getBoatDetail } from "@/features/boats/boat.data";
import { getBoatShowcase } from "@/features/boats/showcase/boat-showcase.data";
import { BoatShowcase } from "@/features/boats/showcase/BoatShowcase";

export default async function BoatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boat = await getBoatDetail(id);
  if (!boat) notFound();
  const data = await getBoatShowcase(boat.id, boat.timezone);
  // Lowest hourly price across the boat's tiers.
  const rates = boat.pricingTiers.filter((t) => t.hours > 0).map((t) => t.price / t.hours);
  const fromHourly = rates.length ? Math.min(...rates) : null;
  return <BoatShowcase boat={boat} data={data} fromHourly={fromHourly} />;
}
