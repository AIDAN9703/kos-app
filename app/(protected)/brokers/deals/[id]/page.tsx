import { notFound } from "next/navigation";

import { DealPage } from "@/features/bookings/components/admin/view-booking/DealPage";
import { getDealPage } from "@/features/bookings/deal.data";

/** Only the broker the deal is assigned to (or an admin) may open it. */
export default async function BrokerDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDealPage(id);
  if (!deal) notFound();
  return <DealPage deal={deal} />;
}
