"use client";

import { useCallback, useMemo, useState } from "react";
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
import { UserCircle2, Eye, Edit, Trash2, MoreVertical, Anchor, UsersRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import type { UserListItem } from "@/features/users/user.types";
import { parseRoles } from "@/shared/lib/auth/permissions";
import { Badge } from "@/shared/components/ui/badge";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { useDeleteUser } from "@/features/users/hooks/useUserMutations";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { canPromoteToCaptain, canPromoteToCrew } from "@/features/profiles/promote-eligibility";
import { PromoteToCaptainModal } from "@/features/profiles/components/PromoteToCaptainModal";
import { PromoteToCrewModal } from "@/features/profiles/components/PromoteToCrewModal";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";

interface AdminUsersTableProps {
  users: UserListItem[];
  loading?: boolean;
}

const columnHelper = createColumnHelper<UserListItem>();

function listDisplayName(u: UserListItem) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || u.email;
}

export function AdminUsersTable({ users, loading }: AdminUsersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: deleteUser } = useDeleteUser();
  const [captainModal, setCaptainModal] = useState<{ id: string; name: string } | null>(null);
  const [crewModal, setCrewModal] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = useCallback(
    (userId: string) => {
      if (!confirm("Are you sure? This action cannot be undone.")) return;
      deleteUser(userId, {
        onSuccess: (result) => {
          if (result.success) {
            router.refresh();
            toast({ title: "User deleted successfully" });
          } else {
            toast({
              title: "Error",
              description:
                typeof result.error === "string" ? result.error : "Failed to delete user",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete user",
            variant: "destructive",
          });
        },
      });
    },
    [deleteUser, router, toast]
  );

  // Define columns - simplified and more compact
  const columns = useMemo(
    () => [
      columnHelper.accessor("firstName", {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.profileImage || undefined} alt={listDisplayName(user)} />
                <DefaultUserAvatarFallback size="sm" />
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium text-foreground text-sm truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                {user.phoneNumber && (
                  <div className="text-xs text-muted-foreground truncate">{user.phoneNumber}</div>
                )}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor("role", {
        header: "Roles",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {parseRoles(info.getValue()).map((role) => (
              <Badge
                key={role}
                variant={role === "customer" ? "secondary" : "default"}
                className="text-xs capitalize"
              >
                {role}
              </Badge>
            ))}
          </div>
        ),
      }),

      columnHelper.accessor("createdAt", {
        header: "Joined",
        cell: (info) => {
          const date = info.getValue();
          return (
            <div className="text-sm text-muted-foreground">{date ? formatDate(date) : "—"}</div>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right pr-2">Actions</div>,
        cell: ({ row }) => {
          const user = row.original;
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
                    <Link href={`/admin/users/${user.id}`} className="cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}/edit`} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Link>
                  </DropdownMenuItem>
                  {canPromoteToCaptain(user.captainProfileStatus) ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setCaptainModal({ id: user.id, name: listDisplayName(user) });
                      }}
                    >
                      <Anchor className="mr-2 h-4 w-4" />
                      Promote to Captain
                    </DropdownMenuItem>
                  ) : null}
                  {canPromoteToCrew(user.crewProfileStatus) ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setCrewModal({ id: user.id, name: listDisplayName(user) });
                      }}
                    >
                      <UsersRound className="mr-2 h-4 w-4" />
                      Promote to Crew
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => handleDelete(user.id)}
                    className="cursor-pointer text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </DropdownMenuItem>
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
    <>
      <AdminDataTable
        data={users}
        columns={columns}
        loading={loading}
        loadingLabel="Loading users…"
        emptyIcon={UserCircle2}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your filters, or add a new user to get started."
      />
      <PromoteToCaptainModal
        userId={captainModal?.id ?? null}
        displayName={captainModal?.name ?? ""}
        open={captainModal != null}
        onOpenChange={(open) => {
          if (!open) setCaptainModal(null);
        }}
      />
      <PromoteToCrewModal
        userId={crewModal?.id ?? null}
        displayName={crewModal?.name ?? ""}
        open={crewModal != null}
        onOpenChange={(open) => {
          if (!open) setCrewModal(null);
        }}
      />
    </>
  );
}
