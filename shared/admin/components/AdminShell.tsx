import type { ReactNode } from "react";
import { AdminTopNav, type TopNavPortal } from "./top-nav/AdminTopNav";
import type { TopNavUser } from "./top-nav/AccountMenu";

/**
 * The admin and broker frame: the top bar, then the page area, which
 * scrolls. data-admin-theme switches globals.css to the admin theme. Pages
 * get the area's full height (h-full), so list pages can pin pagination and
 * scroll their table inside.
 *
 * The page area's padding (px-4 py-4 md:px-6 md:py-6 xl:px-12) matches the
 * top bar's; GlassPage undoes it so its background runs edge to edge. The
 * area itself is full width: pages cap their own content (GlassPage does),
 * at the top bar's max width, 1680px, so the logo lines up.
 */
export function AdminShell({
  portal,
  user,
  actions,
  children,
}: {
  portal: TopNavPortal;
  user: TopNavUser;
  /** Controls on the right of the top bar, before the account menu. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-admin-theme className="flex h-svh flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
      <AdminTopNav portal={portal} user={user} actions={actions} />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 xl:px-12">
        <div className="flex h-full min-h-0 flex-col">{children}</div>
      </main>
    </div>
  );
}
