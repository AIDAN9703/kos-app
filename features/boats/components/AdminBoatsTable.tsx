"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Anchor, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { BoatListItem } from "@/features/boats/boat.types";
import { StatusBadge } from "@/shared/lib/utils/badge-utils";
import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { useDeleteBoat } from "@/features/boats/hooks/useBoatMutations";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";

interface AdminBoatsTableProps {
  boats: BoatListItem[];
  loading?: boolean;
}

const columnHelper = createColumnHelper<BoatListItem>();

export function AdminBoatsTable({ boats, loading }: AdminBoatsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: deleteBoat } = useDeleteBoat();

  const handleDelete = useCallback(
    (boatId: string) => {
      if (!confirm("Are you sure? This action cannot be undone.")) return;
      deleteBoat(boatId, {
        onSuccess: (result) => {
          if (result.success) {
            router.refresh();
            toast({ title: "Boat deleted successfully" });
          } else {
            toast({
              title: "Error",
              description:
                typeof result.error === "string" ? result.error : "Failed to delete boat",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete boat",
            variant: "destructive",
          });
        },
      });
    },
    [deleteBoat, router, toast]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "boat",
        header: "Boat",
        cell: ({ row }) => {
          const boat = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {boat.mainImage ? (
                  <Image
                    src={boat.mainImage}
                    alt={boat.name}
                    width={36}
                    height={36}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Anchor className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-foreground text-sm truncate">{boat.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {boat.lengthFt ? `${boat.lengthFt}ft` : "—"} •{" "}
                  {boat.capacity ? `${boat.capacity} guests` : "—"}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="text-sm capitalize">
            {info.getValue()?.toLowerCase().replace(/_/g, " ") || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("ownerName", {
        header: "Owner",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("basePrice", {
        header: "Base Price",
        cell: (info) => {
          const price = info.getValue();
          return <span className="text-sm font-medium">{price ? formatCurrency(price) : "—"}</span>;
        },
      }),
      columnHelper.accessor("active", {
        header: "Status",
        cell: (info) => {
          const active = info.getValue();
          const featured = info.row.original.featured;
          return (
            <div className="flex flex-col gap-1">
              <StatusBadge status={active} />
              {featured && <StatusBadge status="FEATURED" />}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right pr-2">Actions</div>,
        cell: ({ row }) => {
          const boat = row.original;
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/boats/${boat.id}`} className="cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/boats/${boat.id}/edit`} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Boat
                    </Link>
                  </DropdownMenuItem>
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => handleDelete(boat.id)}
                      className="text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Boat
                    </DropdownMenuItem>
                  </>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ],
    [handleDelete]
  );

  return (
    <AdminDataTable
      data={boats}
      columns={columns}
      loading={loading}
      loadingLabel="Loading boats…"
      emptyIcon={Anchor}
      emptyTitle="No boats found"
      emptyDescription="Try adjusting your filters, or add a new boat to get started."
    />
  );
}
