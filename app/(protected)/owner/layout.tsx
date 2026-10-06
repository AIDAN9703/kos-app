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
 * /owner — the owner portal: its own header (with a clear way back to the
 * customer account) around the site's usual type and colors. Owners only:
 * requireOwner() sends everyone else to /profile; proxy.ts handles sign-in.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  const { name } = await getMyOwnerIdentity();

  return (
    <div className="min-h-svh bg-slate-50/60">
      <OwnerHeader ownerName={name} />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
