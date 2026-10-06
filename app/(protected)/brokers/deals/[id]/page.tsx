import { notFound } from "next/navigation";

import { DealPage } from "@/features/bookings/components/admin/view-booking/DealPage";
import { requireDealAccess } from "@/features/bookings/lib/deal-access";
import { can } from "@/shared/lib/utils/auth-utils";

export default async function BrokerDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only the broker the deal is assigned to (or an admin) may open it.
  const access = await requireDealAccess(id, "view");
  if (access.error !== undefined) notFound();

  const { user } = access.session;
  return (
    <DealPage
      id={id}
      viewer={{
        userId: user.id,
        basePath: "/brokers/deals",
        canAssign: can(user, { booking: ["assign"] }),
        canSeeEconomics: can(user, { booking: ["view-economics"] }),
        canRecordPayments: can(user, { booking: ["record-payment"] }),
      }}
    />
  );
}
