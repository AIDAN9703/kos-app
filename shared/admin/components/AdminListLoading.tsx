import { AdminListShell } from "@/shared/admin/components/AdminListShell";

export function AdminListLoading() {
  return (
    <AdminListShell
      toolbar={
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-3">
          <div className="h-10 max-w-md flex-1 animate-pulse rounded-full bg-glass-inset" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-glass-inset" />
        </div>
      }
    >
      <div className="glass-panel flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    </AdminListShell>
  );
}
