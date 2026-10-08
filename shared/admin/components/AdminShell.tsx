import type { ReactNode } from "react";
import { AdminTopNav, type TopNavPortal } from "./top-nav/AdminTopNav";
import type { TopNavUser } from "./top-nav/AccountMenu";

/**
 * The admin and broker frame: the top bar, then the page area, which
 * scrolls. data-admin-theme switches globals.css to the admin theme. Pages
 * get the area's full height (h-full), so list pages can pin pagination and
 * scroll their table inside.
 *
 * The page area's padding (px-4 py-4 md:px-6 md:py-6 xl:px-12) and max
 * width match the top bar's, so the logo lines up with the page; GlassPage
 * undoes the same padding for full-bleed pages. The max width is 1600px or
 * 90% of the screen, whichever is wider: a laptop gets 1600px, and a big
 * monitor (or a zoomed-out browser) fills out instead of a narrow column.
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
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[max(1600px,90vw)] flex-col">{children}</div>
      </main>
    </div>
  );
}
