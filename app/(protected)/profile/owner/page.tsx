import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { OwnerDashboard } from "@/features/profile/components/roles/OwnerDashboard";
import { getOwnedBoats, getUpcomingOwnerCharters } from "@/features/profile/profile.queries";

export const dynamic = "force-dynamic";

/** Owners only — requireOwner() sends everyone else back to /profile. */
export default async function OwnerPage() {
  const session = await requireOwner();
  const [boats, charters] = await Promise.all([
    getOwnedBoats(session.user.id),
    getUpcomingOwnerCharters(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Owner dashboard" description="Your boats in the KOS fleet and the charters booked on them." />
      <OwnerDashboard boats={boats} charters={charters} />
    </div>
  );
}
