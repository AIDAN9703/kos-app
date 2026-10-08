import type { SearchParams } from "nuqs/server";
import { listUsers } from "@/features/users/user.data";
import { userSearchParamsCache } from "@/features/users/searchParams";
import { AddUserButton, AdminUserFilter } from "@/features/users/components/AdminUserFilter";
import { AdminUserTablePagination } from "@/features/users/components/AdminUserTablePagination";
import { AdminUsersTable } from "@/features/users/components/AdminUsersTable";
import { NewUserSheet } from "@/features/users/components/NewUserSheet";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { search, view, page, limit } = await userSearchParamsCache.parse(searchParams);
  const result = await listUsers({ search: search || undefined, view: view ?? undefined, page, limit });

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader title="Users" actions={<AddUserButton />} />
            <AdminUserFilter />
          </>
        }
        pagination={
          <AdminUserTablePagination
            totalCount={result.totalCount}
            totalPages={result.totalPages}
            page={result.page}
            limit={result.limit}
          />
        }
      >
        <AdminUsersTable users={result.users} />
      </AdminListShell>
      <NewUserSheet />
    </GlassPage>
  );
}
