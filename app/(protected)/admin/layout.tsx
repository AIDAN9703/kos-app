import { ReactNode } from "react";
import { Settings } from "lucide-react";
import { requireAdmin } from "@/shared/lib/utils/auth-utils";
import { QueryProvider } from "@/shared/lib/providers/QueryProvider";
import KBar from "@/shared/admin/components/kbar";
import { AdminShell } from "@/shared/admin/components/AdminShell";
import { CircleLink, SearchButton } from "@/shared/admin/components/top-nav/controls";
import { QuickActions } from "@/shared/admin/components/top-nav/QuickActions";
import { NotificationsBell } from "@/features/admin/dashboard/NotificationsBell";
import "@/shared/admin/admin-fullcalendar.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Defense-in-depth: middleware checks admin too, but never rely on it alone.
  const { user } = await requireAdmin();

  return (
    <KBar>
      <QueryProvider>
        <AdminShell
          portal="admin"
          user={{ name: user.name, email: user.email, image: user.profileImage }}
          actions={
            <>
              <SearchButton />
              <QuickActions />
              <NotificationsBell />
              <CircleLink href="/admin/settings" label="Settings">
                <Settings />
              </CircleLink>
            </>
          }
        >
          {children}
        </AdminShell>
      </QueryProvider>
    </KBar>
  );
}
