"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { Megaphone } from "lucide-react";
import type { CampaignListItem } from "@/features/marketing/marketing.types";
import { AUDIENCE_ALL } from "@/features/marketing/marketing.types";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { CampaignStatusBadge, effectiveStatus } from "./campaign-status";

const columnHelper = createColumnHelper<CampaignListItem>();

/** Every campaign, newest first. A row opens it. */
export function CampaignsTable({ campaigns }: { campaigns: CampaignListItem[] }) {
  const router = useRouter();
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Campaign",
        cell: (info) => <span className="block max-w-[18rem] truncate text-sm font-medium text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor("subject", {
        header: "Subject",
        cell: (info) => <span className="block max-w-[22rem] truncate text-sm text-muted-foreground">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("audience", {
        header: "Audience",
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">{info.getValue() === AUDIENCE_ALL ? "Everyone" : info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => <CampaignStatusBadge campaign={row.original} />,
      }),
      columnHelper.display({
        id: "date",
        header: "Date",
        cell: ({ row }) => {
          const c = row.original;
          const date = effectiveStatus(c) === "SENT" ? (c.sentAt ?? c.scheduledAt) : c.status === "SCHEDULED" ? c.scheduledAt : c.updatedAt;
          return <span className="whitespace-nowrap text-sm text-muted-foreground">{date ? formatDate(date) : "—"}</span>;
        },
      }),
      columnHelper.accessor("recipientCount", {
        header: "Recipients",
        cell: (info) => <span className="text-sm tabular-nums text-muted-foreground">{info.getValue()?.toLocaleString() ?? "—"}</span>,
      }),
    ],
    []
  );
  return (
    <AdminDataTable
      data={campaigns}
      columns={columns}
      onRowClick={(c) => router.push(`/admin/marketing/${c.id}`)}
      emptyIcon={Megaphone}
      emptyTitle="No campaigns yet"
      emptyDescription="Start one with New campaign. It saves as a draft until you send it."
    />
  );
}
