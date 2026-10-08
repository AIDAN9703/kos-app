"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils/general-utils";
import { AdminEmptyState } from "./AdminEmptyState";

interface AdminDataTableProps<TData> {
  data: TData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  columnVisibility?: VisibilityState;
  loading?: boolean;
  loadingLabel?: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  onRowClick?: (row: TData) => void;
}

/** The sticky header row: opaque, so rows scroll cleanly underneath, and
 *  above cells that lift their content (CopyableText is z-10). */
const headerClass = "sticky top-0 z-20 bg-glass-solid";
/** Each cell carries the header's color with a 1px overlap, so columns that
 *  land on fractional pixels don't show hairline seams. */
const headClass =
  "bg-glass-solid text-xs font-medium text-muted-foreground shadow-[1px_0_0_var(--glass-solid)] first:pl-5 last:pr-5";

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

function getColumnMeta(meta: unknown): ColumnMeta {
  return (meta ?? {}) as ColumnMeta;
}

/**
 * Admin data table — shadcn Table + TanStack Table (see ui.shadcn.com/docs/components/data-table).
 * Column widths come from cell content; truncate inside cells where needed.
 */
export function AdminDataTable<TData>({
  data,
  columns,
  columnVisibility,
  loading,
  loadingLabel = "Loading…",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRowClick,
}: AdminDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: columnVisibility ? { columnVisibility } : undefined,
  });

  if (loading) {
    return (
      <div className="glass-panel flex min-h-0 flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <AdminEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Table className="table-auto">
        <TableHeader className={headerClass}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-glass-border hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const meta = getColumnMeta(header.column.columnDef.meta);
                return (
                  <TableHead
                    key={header.id}
                    className={cn(headClass, "h-11 p-0 px-2", meta.headerClassName)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn("border-glass-border hover:bg-glass-inset", onRowClick && "cursor-pointer")}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = getColumnMeta(cell.column.columnDef.meta);
                return (
                  <TableCell
                    key={cell.id}
                    className={cn("p-0 px-2 py-3 first:pl-5 last:pr-5", meta.cellClassName)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
