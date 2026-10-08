import { listAddOns } from "@/features/add-ons/add-on.data";
import { addOnSearchParamsCache } from "@/features/add-ons/searchParams";
import { AdminAddOnFilter, NewAddOnButton } from "@/features/add-ons/components/AdminAddOnFilter";
import { AdminAddOnsTable } from "@/features/add-ons/components/AdminAddOnsTable";
import { AdminAddOnTablePagination } from "@/features/add-ons/components/AdminAddOnTablePagination";
import type { SearchParams } from "nuqs/server";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

export default async function AddOnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await addOnSearchParamsCache.parse(searchParams);

  const result = await listAddOns({
    search: params.search || undefined,
    category: params.category ?? undefined,
    active: params.active ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader title="Add-ons" actions={<NewAddOnButton />} />
            <AdminAddOnFilter />
          </>
        }
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
    </GlassPage>
  );
}
