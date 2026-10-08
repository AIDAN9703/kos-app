"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, UserX, Users } from "lucide-react";
import type { MarketingContactRow } from "@/features/marketing/marketing.types";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { unsubscribeContact } from "@/features/marketing/marketing.actions";

const columnHelper = createColumnHelper<MarketingContactRow>();

function Status({ contact }: { contact: MarketingContactRow }) {
  if (!contact.subscribed) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Unsubscribed</span>;
  if (!contact.synced) return <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Waiting to sync</span>;
  return <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Subscribed</span>;
}

/** The marketing list. Unsubscribing someone here (they asked) also turns marketing off on their account. */
export function ContactsTable({ contacts }: { contacts: MarketingContactRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <span className="block max-w-[20rem] truncate text-sm text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="block max-w-[14rem] truncate text-sm text-muted-foreground">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("source", {
        header: "List",
        cell: (info) => <span className="whitespace-nowrap text-sm text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor("subscribed", {
        header: "Status",
        cell: ({ row }) => <Status contact={row.original} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Added",
        cell: (info) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          row.original.subscribed ? (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${row.original.email}`} disabled={busyId === row.original.id}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={async () => {
                      setBusyId(row.original.id);
                      const result = await unsubscribeContact(row.original.id);
                      setBusyId(null);
                      toast(
                        result.success
                          ? { title: `${row.original.email} unsubscribed` }
                          : { title: "That didn't work", description: result.error, variant: "destructive" }
                      );
                      router.refresh();
                    }}
                  >
                    <UserX className="size-4" />
                    Unsubscribe
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null,
      }),
    ],
    [busyId, router, toast]
  );

  return (
    <AdminDataTable
      data={contacts}
      columns={columns}
      emptyIcon={Users}
      emptyTitle="No contacts match"
      emptyDescription="Import a CSV, or sync to bring in accounts and booked customers."
    />
  );
}
