import { listAddOns } from "@/features/add-ons/add-on.data";
import { addOnSearchParamsCache } from "@/features/add-ons/searchParams";
import { AdminAddOnFilter } from "@/features/add-ons/components/AdminAddOnFilter";
import { AdminAddOnsTable } from "@/features/add-ons/components/AdminAddOnsTable";
import { AdminAddOnTablePagination } from "@/features/add-ons/components/AdminAddOnTablePagination";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { SearchParams } from "next/dist/server/request/search-params";

export default async function AddOnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await addOnSearchParamsCache.parse(searchParams);
  const params = addOnSearchParamsCache.all();

  const result = await listAddOns({
    search: params.search || undefined,
    category: params.category ?? undefined,
    active: params.active ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
    <AdminListShell
      toolbar={<AdminAddOnFilter />}
      pagination={
        <AdminAddOnTablePagination
          totalCount={result.totalCount}
          totalPages={result.totalPages}
          page={result.page}
          limit={result.limit}
        />
      }
    >
      <AdminAddOnsTable addOns={result.addOns} />
    </AdminListShell>
  );
}
