import type { SearchParams } from "nuqs/server";
import { listUsers } from "@/features/users/user.data";
import { userSearchParamsCache } from "@/features/users/searchParams";
import { AdminUserFilter } from "@/features/users/components/AdminUserFilter";
import { AdminUserTablePagination } from "@/features/users/components/AdminUserTablePagination";
import { AdminUsersTable } from "@/features/users/components/AdminUsersTable";
import { NewUserSheet } from "@/features/users/components/NewUserSheet";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { search, view, page, limit } = await userSearchParamsCache.parse(searchParams);
  const result = await listUsers({ search: search || undefined, view: view ?? undefined, page, limit });

  return (
    <>
      <AdminListShell
        toolbar={<AdminUserFilter />}
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
    </>
  );
}
