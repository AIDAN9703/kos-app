import { Suspense } from "react";

import { getAppSettings } from "@/features/app-settings/app-settings.service";
import BoatInquiryDetailsClient, {
  type InquiryCurrentUser,
} from "@/features/bookings/components/lead-intake/BoatInquiryDetailsClient";
import { getSession } from "@/shared/lib/utils/auth-utils";

export default async function BoatInquiryPage() {
  const [settings, session] = await Promise.all([getAppSettings(), getSession()]);

  // Signed-in visitors submit as their account ("Welcome back"); guests get
  // the in-page auth gate. The route itself stays publicly reachable so the
  // boat-lead funnel never dead-ends at a redirect.
  const user = session?.user;
  const currentUser: InquiryCurrentUser | null = user
    ? {
        firstName: user.firstName ?? "",
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email,
        phone: user.phoneNumber ?? "",
      }
    : null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <BoatInquiryDetailsClient
        serviceFee={settings.serviceFee}
        currentUser={currentUser}
      />
    </Suspense>
  );
}
