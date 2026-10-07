"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { UserCircle2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import { parseRoles } from "@/shared/lib/auth/permissions";
import { formatDate, formatPhoneNumberForDisplay } from "@/shared/lib/utils/general-utils";
import type { UserListItem } from "@/features/users/user.types";
import { RoleChips } from "./RoleChips";

const columnHelper = createColumnHelper<UserListItem>();

function listDisplayName(u: UserListItem) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

/** The people list. A row opens that person's page, where every change is made. */
export function AdminUsersTable({ users }: { users: UserListItem[] }) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("firstName", {
        id: "user",
        header: "Person",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.profileImage || undefined} alt={listDisplayName(user)} />
                <DefaultUserAvatarFallback size="sm" />
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{listDisplayName(user)}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("phoneNumber", {
        header: "Phone",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatPhoneNumberForDisplay(info.getValue()) || "—"}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Access",
        cell: ({ row }) => <RoleChips roles={parseRoles(row.original.role)} deactivated={Boolean(row.original.banned)} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Joined",
        cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
      }),
    ],
    []
  );

  return (
    <AdminDataTable
      data={users}
      columns={columns}
      onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
      emptyIcon={UserCircle2}
      emptyTitle="No people match"
      emptyDescription="Try a different search or view."
    />
  );
}
