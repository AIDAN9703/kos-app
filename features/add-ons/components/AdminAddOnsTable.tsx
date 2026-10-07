"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, MoreVertical, PackagePlus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { StatusBadge } from "@/shared/lib/utils/badge-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { deleteAddOn } from "@/features/add-ons/add-on.actions";
import { addOnCategoryLabel } from "@/features/add-ons/add-on.constants";
import { AddOnFormModal } from "@/features/add-ons/components/AddOnFormModal";
import type { AddOnListItem } from "@/features/add-ons/add-on.types";

const columnHelper = createColumnHelper<AddOnListItem>();

export function AdminAddOnsTable({ addOns }: { addOns: AddOnListItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<AddOnListItem | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this add-on? Boats currently offering it will lose it.")) return;
      const result = await deleteAddOn(id);
      if (result.success) {
        toast({ title: "Add-on deleted." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    },
    [router, toast]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Add-on",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{row.original.name}</div>
            {row.original.description && (
              <div className="truncate text-xs text-muted-foreground">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => <span className="text-sm">{addOnCategoryLabel(info.getValue())}</span>,
      }),
      columnHelper.accessor("defaultPriceCents", {
        header: "Suggested price",
        cell: (info) => {
          const cents = info.getValue();
          return (
            <span className="text-sm font-medium">
              {cents != null ? formatCentsAsCurrency(cents) : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="pr-2 text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setEditing(row.original)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => handleDelete(row.original.id)}
                  className="cursor-pointer text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ],
    [handleDelete]
  );

  return (
    <>
      <AdminDataTable
        data={addOns}
        columns={columns}
        emptyIcon={PackagePlus}
        emptyTitle="No add-ons yet"
        emptyDescription="Create catalog add-ons, then offer them on individual boats."
      />
      <AddOnFormModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        addOn={editing}
      />
    </>
  );
}
