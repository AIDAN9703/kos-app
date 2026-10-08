"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { Anchor } from "lucide-react";
import type { BoatListItem } from "@/features/boats/boat.types";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { formatCurrency } from "@/shared/lib/utils/general-utils";

const columnHelper = createColumnHelper<BoatListItem>();

const chip = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/** The fleet. A row opens that boat's page, where it's edited or deleted. */
export function AdminBoatsTable({ boats }: { boats: BoatListItem[] }) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "boat",
        header: "Boat",
        cell: ({ row }) => {
          const boat = row.original;
          return (
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-glass-inset ring-1 ring-glass-border">
                {boat.mainImage ? (
                  <Image src={boat.mainImage} alt="" width={36} height={36} className="size-full object-cover" />
                ) : (
                  <Anchor className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{boat.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[boat.lengthFt ? `${boat.lengthFt}ft` : null, boat.capacity ? `${boat.capacity} guests` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="text-sm capitalize text-muted-foreground">
            {info.getValue()?.toLowerCase().replace(/_/g, " ") || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("ownerName", {
        header: "Owner",
        cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("basePrice", {
        header: "Base price",
        cell: (info) => {
          const price = info.getValue();
          return <span className="text-sm font-medium tabular-nums">{price ? formatCurrency(price) : "—"}</span>;
        },
      }),
      columnHelper.accessor("active", {
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <span
              className={`${chip} ${
                row.original.active
                  ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-slate-400/15 text-slate-300 ring-slate-400/30"
              }`}
            >
              {row.original.active ? "Listed" : "Hidden"}
            </span>
            {row.original.featured ? (
              <span className={`${chip} bg-primary/15 text-primary-strong ring-primary/30`}>Featured</span>
            ) : null}
          </div>
        ),
      }),
    ],
    []
  );

  return (
    <AdminDataTable
      data={boats}
      columns={columns}
      onRowClick={(boat) => router.push(`/admin/boats/${boat.id}`)}
      emptyIcon={Anchor}
      emptyTitle="No boats found"
      emptyDescription="Try a different search or view, or add a new boat."
    />
  );
}
