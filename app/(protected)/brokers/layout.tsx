import { ReactNode } from "react";
import { cookies } from "next/headers";

import { requireBrokerPortal } from "@/shared/lib/utils/auth-utils";
import AdminSidebar from "@/shared/admin/components/AdminSidebar";
import AdminHeader from "@/shared/admin/components/AdminHeader";
import { DealsBasePathProvider } from "@/features/bookings/components/admin/deal-links";
import { QueryProvider } from "@/shared/lib/providers/QueryProvider";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import "@/shared/admin/admin-theme.css";

/**
 * The broker portal: the admin area's shell and deal screens, limited to the
 * broker's own deals (every action re-checks that in
 * features/bookings/lib/deal-access.ts).
 */
export default async function BrokerLayout({ children }: { children: ReactNode }) {
  await requireBrokerPortal();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      data-admin-theme
      className="admin-theme bg-background text-foreground font-sans antialiased h-svh overflow-hidden"
    >
      <AdminSidebar nav="broker" />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AdminHeader tools={false} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <QueryProvider>
            <DealsBasePathProvider basePath="/brokers/deals">
              <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
            </DealsBasePathProvider>
          </QueryProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
