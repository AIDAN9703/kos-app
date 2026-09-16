import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Navigation from "@/shared/components/layouts/Navigation";
import Footer from "@/shared/components/layouts/Footer";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { ProfileShell } from "@/features/profile/components/ProfileShell";
import { countCompletedTrips, getAccount } from "@/features/profile/profile.queries";

/**
 * /profile — the customer's own account area. Same site header and footer as
 * the rest of kosyachts.com; the section's own navigation sits beside the
 * content (see ProfileShell). proxy.ts already redirects signed-out visitors;
 * requireAuth() is defence in depth.
 */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();
  const [account, tripsCompleted] = await Promise.all([
    getAccount(session.user.id),
    countCompletedTrips(session.user.id),
  ]);
  if (!account) redirect("/sign-in");

  return (
    <>
      <Navigation />
      <ProfileShell
        account={account}
        roles={{
          isAdmin: session.user.isAdmin,
          isOwner: session.user.isOwner,
          isCaptain: session.user.isCaptain,
        }}
        tripsCompleted={tripsCompleted}
      >
        {children}
      </ProfileShell>
      <Footer />
    </>
  );
}
