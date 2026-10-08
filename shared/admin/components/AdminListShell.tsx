import type { ReactNode } from "react";

/**
 * List page layout: toolbar (top) + table (middle) + pagination (bottom).
 * The table is as tall as its rows, with the pagination right under it; when
 * the rows outgrow the screen, it stops at the screen's height and scrolls
 * inside, so the pagination stays in view. The table child must use
 * `flex-1 min-h-0 overflow-auto` (see AdminDataTable).
 */
export function AdminListShell({
  toolbar,
  pagination,
  children,
}: {
  toolbar?: ReactNode;
  pagination?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      <div className="flex min-h-0 flex-col overflow-hidden">{children}</div>
      {pagination ? <div className="shrink-0">{pagination}</div> : null}
    </div>
  );
}
