import { ReactNode } from "react";
import { requireAdmin } from "@/shared/lib/utils/auth-utils";
import AdminSidebar from "@/shared/admin/components/AdminSidebar";
import AdminHeader from "@/shared/admin/components/AdminHeader";
import { QueryProvider } from "@/shared/lib/providers/QueryProvider";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import KBar from "@/shared/admin/components/kbar";
import { cookies } from "next/headers";
import "@/shared/admin/admin-theme.css";
import "@/shared/admin/admin-fullcalendar.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Defense-in-depth: middleware checks admin too, but never rely on it alone.
  await requireAdmin();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <>
      <KBar>
        <SidebarProvider
          defaultOpen={defaultOpen}
          data-admin-theme
          className="admin-theme bg-background text-foreground font-sans antialiased h-svh overflow-hidden"
        >
          <AdminSidebar />
          <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              <QueryProvider>
                <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
              </QueryProvider>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </KBar>
    </>
  );
}
