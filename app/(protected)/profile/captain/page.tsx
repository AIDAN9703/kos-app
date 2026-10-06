import { redirect } from "next/navigation";
import { requireCaptain } from "@/shared/lib/utils/auth-utils";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { CaptainDashboard } from "@/features/profile/components/roles/CaptainDashboard";
import { getMyCaptainSummary } from "@/features/profile/profile.data";

/** Captains only — requireCaptain() sends everyone else back to /profile. */
export default async function CaptainPage() {
  await requireCaptain();
  const summary = await getMyCaptainSummary();
  // Session says captain but the profile row is gone: nothing to show here.
  if (!summary) redirect("/profile");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Captain dashboard"
        description="Your standing with KOS and the charters you're assigned to."
      />
      <CaptainDashboard summary={summary} />
    </div>
  );
}
