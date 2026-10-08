"use client";

import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { PackagePlus } from "lucide-react";

import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { addOnCategoryLabel } from "@/features/add-ons/add-on.constants";
import { AddOnFormModal } from "@/features/add-ons/components/AddOnFormModal";
import type { AddOnListItem } from "@/features/add-ons/add-on.types";

const columnHelper = createColumnHelper<AddOnListItem>();

/** The add-on catalog. A row opens it to edit (or delete). */
export function AdminAddOnsTable({ addOns }: { addOns: AddOnListItem[] }) {
  const [editing, setEditing] = useState<AddOnListItem | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Add-on",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{row.original.name}</div>
            {row.original.description && (
              <div className="truncate text-xs text-muted-foreground">{row.original.description}</div>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => <span className="text-sm text-muted-foreground">{addOnCategoryLabel(info.getValue())}</span>,
      }),
      columnHelper.accessor("defaultPriceCents", {
        header: "Suggested price",
        cell: (info) => {
          const cents = info.getValue();
          return (
            <span className="text-sm font-medium tabular-nums">{cents != null ? formatCentsAsCurrency(cents) : "—"}</span>
          );
        },
      }),
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              info.getValue()
                ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                : "bg-slate-400/15 text-slate-300 ring-slate-400/30"
            }`}
          >
            {info.getValue() ? "Active" : "Inactive"}
          </span>
        ),
      }),
    ],
    []
  );

  return (
    <>
      <AdminDataTable
        data={addOns}
        columns={columns}
        onRowClick={setEditing}
        emptyIcon={PackagePlus}
        emptyTitle="No add-ons yet"
        emptyDescription="Create catalog add-ons, then offer them on individual boats."
      />
      <AddOnFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} addOn={editing} />
    </>
  );
}
