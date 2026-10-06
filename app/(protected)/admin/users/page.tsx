import { userService } from "@/features/users/user.service";
import { userSearchParamsCache } from "@/features/users/searchParams";
import { AdminUserFilter } from "@/features/users/components/AdminUserFilter";
import { AdminUserTablePagination } from "@/features/users/components/AdminUserTablePagination";
import { AdminUsersTable } from "@/features/users/components/AdminUsersTable";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { SearchParams } from "next/dist/server/request/search-params";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await userSearchParamsCache.parse(searchParams);
  const params = userSearchParamsCache.all();

  const result = await userService.getAllUsers({
    search: params.search || undefined,
    isAdmin: params.isAdmin ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
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
  );
}
