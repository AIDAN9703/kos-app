import { DealPage } from "@/features/bookings/components/admin/view-booking/DealPage";
import { requireAdmin } from "@/shared/lib/utils/auth-utils";

export default async function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, requireAdmin()]);
  return (
    <DealPage
      id={id}
      viewer={{
        userId: session.user.id,
        basePath: "/admin/bookings",
        canAssign: true,
        canSeeEconomics: true,
        canRecordPayments: true,
      }}
    />
  );
}
