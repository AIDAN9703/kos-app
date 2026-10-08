import { ReactNode } from "react";

import { requireBrokerPortal } from "@/shared/lib/utils/auth-utils";
import { AdminShell } from "@/shared/admin/components/AdminShell";
import { DealsBasePathProvider } from "@/features/bookings/components/admin/deal-links";
import { QueryProvider } from "@/shared/lib/providers/QueryProvider";

/**
 * The broker portal: the admin area's shell and deal screens, limited to the
 * broker's own deals (every read and action re-checks that in
 * features/bookings/deal.data.ts). No search, create or notifications: those
 * reach company-wide data.
 */
export default async function BrokerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireBrokerPortal();

  return (
    <QueryProvider>
      <DealsBasePathProvider basePath="/brokers/deals">
        <AdminShell portal="broker" user={{ name: user.name, email: user.email, image: user.profileImage }}>
          {children}
        </AdminShell>
      </DealsBasePathProvider>
    </QueryProvider>
  );
}
