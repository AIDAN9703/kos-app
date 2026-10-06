import { notFound } from "next/navigation";

import { DealPage } from "@/features/bookings/components/admin/view-booking/DealPage";
import { getDealPage } from "@/features/bookings/deal.data";

export default async function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDealPage(id);
  if (!deal) notFound();
  return <DealPage deal={deal} />;
}
