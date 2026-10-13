import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { OwnerHeader } from "@/features/owner-dashboard/components/OwnerHeader";
import { getMyOwnerIdentity } from "@/features/owner-dashboard/owner.data";

export const metadata: Metadata = {
  title: "Owner portal",
  robots: { index: false, follow: false },
};

/**
 * /owner — the owner portal, in the admin's glass theme (data-admin-theme
 * switches globals.css to it, like AdminShell). Owners only: requireOwner()
 * sends everyone else to /profile; proxy.ts handles sign-in.
 *
 * The page area's padding matches the top bar's; GlassPage undoes it so its
 * background runs edge to edge, then caps its own content.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  const { name } = await getMyOwnerIdentity();

  return (
    <div
      data-admin-theme
      className="flex h-svh flex-col overflow-hidden bg-background font-sans text-foreground antialiased"
    >
      <OwnerHeader ownerName={name} />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 xl:px-12">
        <div className="flex min-h-full flex-col">{children}</div>
      </main>
    </div>
  );
}
