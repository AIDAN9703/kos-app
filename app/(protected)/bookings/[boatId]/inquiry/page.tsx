import { Suspense } from "react";

import { auth } from "@/auth";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { userService } from "@/features/users/user.service";
import BoatInquiryDetailsClient, {
  type InquiryCurrentUser,
} from "@/features/bookings/components/lead-intake/BoatInquiryDetailsClient";

export default async function BoatInquiryPage() {
  const [settings, session] = await Promise.all([getAppSettings(), auth()]);

  // Signed-in visitors submit as their account ("Welcome back"); guests get
  // the in-page auth gate. The route itself stays publicly reachable so the
  // boat-lead funnel never dead-ends at a redirect.
  let currentUser: InquiryCurrentUser | null = null;
  if (session?.user?.id) {
    const user = await userService.getUserById(session.user.id);
    if (user) {
      currentUser = {
        firstName: user.firstName ?? "",
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email ?? "",
        phone: user.phoneNumber ?? "",
      };
    }
  }

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
