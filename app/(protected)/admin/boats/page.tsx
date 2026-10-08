import { listBoats } from "@/features/boats/boat.data";
import { boatSearchParamsCache } from "@/features/boats/searchParams";
import { AdminBoatFilter } from "@/features/boats/components/AdminBoatFilter";
import { AdminBoatTablePagination } from "@/features/boats/components/AdminBoatTablePagination";
import { AdminBoatsTable } from "@/features/boats/components/AdminBoatsTable";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";

export default async function BoatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await boatSearchParamsCache.parse(searchParams);

  const result = await listBoats({
    search: params.search || undefined,
    category: params.category ?? undefined,
    featured: params.featured ?? undefined,
    active: params.active ?? undefined,
    minPrice: params.minPrice ?? undefined,
    maxPrice: params.maxPrice ?? undefined,
    minLength: params.minLength ?? undefined,
    maxLength: params.maxLength ?? undefined,
    minCapacity: params.minCapacity ?? undefined,
    maxCapacity: params.maxCapacity ?? undefined,
    minYear: params.minYear ?? undefined,
    maxYear: params.maxYear ?? undefined,
    minSleeps: params.minSleeps ?? undefined,
    minBathrooms: params.minBathrooms ?? undefined,
    locationLabel: params.locationLabel ?? undefined,
    crewRequired: params.crewRequired ?? undefined,
    instantBook: params.instantBook ?? undefined,
    dayCharter: params.dayCharter ?? undefined,
    termCharter: params.termCharter ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="Boats"
              actions={
                <Button asChild className="h-9 gap-1.5 rounded-full px-4 font-semibold">
                  <Link href="/admin/boats/create">
                    <Plus className="size-3.5" />
                    New boat
                  </Link>
                </Button>
              }
            />
            <AdminBoatFilter />
          </>
        }
        pagination={
          <AdminBoatTablePagination
            totalCount={result.totalCount}
            totalPages={result.totalPages}
            page={result.page}
            limit={result.limit}
          />
        }
      >
        <AdminBoatsTable boats={result.boats} />
      </AdminListShell>
    </GlassPage>
  );
}
